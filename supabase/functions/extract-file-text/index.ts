/**
 * extract-file-text
 *
 * Accepts a file (image or PDF) via multipart/form-data and returns AI-extracted
 * text + summary — no DB writes, pure extraction helper for the Capture Gateway.
 *
 * Body: multipart/form-data with field "file" (image/* or application/pdf)
 *
 * Returns:
 *   { extracted_text, summary, document_type }
 *
 * Supported types: image/jpeg, image/png, image/gif, image/webp, application/pdf
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function fileToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
}

async function extractWithGemini(
  fileBytes: Uint8Array,
  mimeType: string,
  apiKey: string
): Promise<{ extracted_text: string; summary: string; document_type: string }> {
  const base64 = fileToBase64(fileBytes);
  const isPdf = mimeType === "application/pdf";

  const systemPrompt = isPdf
    ? "You are a document analysis engine. Extract all text content from this PDF document. Provide a concise summary and document type."
    : "You are an OCR and image analysis engine. Extract ALL readable text from the image. Then summarize the image content and identify the document type.";

  const userContent = isPdf
    ? [
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        { type: "text", text: "Extract all text from this document, summarize it, and identify the document type. Use the extract_content tool." },
      ]
    : [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        { type: "text", text: "Extract all text from this image, summarize it, and identify the document type. Use the extract_content tool." },
      ];

  // Use Gemini direct API (OpenAI-compatible) — works with both GEMINI_API_KEY and LOVABLE_API_KEY
  const isGeminiDirect = !apiKey.startsWith("lv_") && !apiKey.startsWith("sk-lovable");
  const endpoint = isGeminiDirect
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = isGeminiDirect ? "gemini-flash-latest" : "google/gemini-2.5-flash";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_content",
            description: "Return extracted text, summary, and document type from a file.",
            parameters: {
              type: "object",
              properties: {
                extracted_text: {
                  type: "string",
                  description: "All readable text found in the file. Empty string if none.",
                },
                summary: {
                  type: "string",
                  description: "Concise 1-3 sentence summary of the file's content.",
                },
                document_type: {
                  type: "string",
                  description: "Type of document, e.g. receipt, screenshot, notes, diagram, invoice, photo, article, etc.",
                },
              },
              required: ["extracted_text", "summary", "document_type"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_content" } },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI returned no tool call");
  }

  const result = JSON.parse(toolCall.function.arguments);
  return {
    extracted_text: result.extracted_text ?? "",
    summary: result.summary ?? "",
    document_type: result.document_type ?? "unknown",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const AI_KEY = GEMINI_API_KEY || LOVABLE_API_KEY;
  if (!AI_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration missing" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Missing 'file' field" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return new Response(
      JSON.stringify({ error: `Unsupported file type: ${mimeType}. Supported: ${[...SUPPORTED_MIME_TYPES].join(", ")}` }),
      { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
    return new Response(JSON.stringify({ error: "File too large. Maximum size is 10 MB." }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileBytes = new Uint8Array(arrayBuffer);

  try {
    const result = await extractWithGemini(fileBytes, mimeType, AI_KEY);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    console.error("extract-file-text error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
