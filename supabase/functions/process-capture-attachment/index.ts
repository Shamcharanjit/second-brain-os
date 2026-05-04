import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "capture-uploads";

// ── AI endpoint resolver ──
// Returns the right endpoint + model based on the API key type.
// GEMINI_API_KEY (Google AI Studio) uses the direct Gemini OpenAI-compatible API.
// LOVABLE_API_KEY uses the Lovable gateway.
function getAiConfig(apiKey: string): { endpoint: string; model: string } {
  const isLovable = apiKey.startsWith("lv_") || apiKey.startsWith("sk-lovable");
  return isLovable
    ? { endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash" }
    : { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-flash-latest" };
}

// ── Helpers ──

function resolveKind(mimeType: string | null): "image" | "pdf" | "audio" | "other" {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

function fileToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Extraction handlers ──

async function extractImage(
  fileBytes: Uint8Array,
  mimeType: string,
  apiKey: string
): Promise<{ extracted_text: string; summary: string; structured_json: Record<string, unknown> }> {
  const base64 = fileToBase64(fileBytes);
  const { endpoint: aiEndpoint, model: aiModel } = getAiConfig(apiKey);

  const response = await fetch(aiEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        {
          role: "system",
          content:
            "You are an OCR and image analysis engine. Extract ALL readable text from the image. Then provide a concise summary of the image content. Respond using the provided tool.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: "text",
              text: "Extract all text and describe this image. Use the extract_image_content tool.",
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_image_content",
            description: "Return extracted text and summary from an image.",
            parameters: {
              type: "object",
              properties: {
                extracted_text: { type: "string", description: "All readable text found in the image. Empty string if none." },
                summary: { type: "string", description: "Concise 1-3 sentence summary of what the image shows." },
                has_readable_text: { type: "boolean" },
                document_type: { type: "string", description: "e.g. receipt, screenshot, photo, diagram, handwriting, etc." },
              },
              required: ["extracted_text", "summary", "has_readable_text", "document_type"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_image_content" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI returned no tool call for image extraction");
  }

  const result = JSON.parse(toolCall.function.arguments);
  return {
    extracted_text: result.extracted_text || "",
    summary: result.summary || "Image processed.",
    structured_json: {
      has_readable_text: result.has_readable_text ?? false,
      document_type: result.document_type ?? "unknown",
    },
  };
}

async function extractPdf(
  fileBytes: Uint8Array,
  apiKey: string
): Promise<{ extracted_text: string; summary: string; structured_json: Record<string, unknown> }> {
  // Send PDF as base64 to vision model for text extraction
  const base64 = fileToBase64(fileBytes);
  const { endpoint: aiEndpoint2, model: aiModel2 } = getAiConfig(apiKey);

  const response = await fetch(aiEndpoint2, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel2,
      messages: [
        {
          role: "system",
          content:
            "You are a document analysis engine. Extract all text content from this PDF document. Provide a concise summary. Use the provided tool to return results.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
            {
              type: "text",
              text: "Extract all text from this PDF and summarize it. Use the extract_pdf_content tool.",
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_pdf_content",
            description: "Return extracted text and summary from a PDF.",
            parameters: {
              type: "object",
              properties: {
                extracted_text: { type: "string", description: "All text content from the PDF." },
                summary: { type: "string", description: "Concise 2-4 sentence summary of the document." },
                page_estimate: { type: "number", description: "Estimated number of pages if determinable, 0 otherwise." },
              },
              required: ["extracted_text", "summary", "page_estimate"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_pdf_content" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI returned no tool call for PDF extraction");
  }

  const result = JSON.parse(toolCall.function.arguments);
  return {
    extracted_text: result.extracted_text || "",
    summary: result.summary || "PDF processed.",
    structured_json: {
      page_estimate: result.page_estimate ?? 0,
      text_length: (result.extracted_text || "").length,
    },
  };
}

async function extractAudio(
  fileBytes: Uint8Array,
  mimeType: string,
  apiKey: string
): Promise<{ extracted_text: string; summary: string; structured_json: Record<string, unknown> }> {
  const base64 = fileToBase64(fileBytes);
  const { endpoint: aiEndpoint3, model: aiModel3 } = getAiConfig(apiKey);

  const response = await fetch(aiEndpoint3, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel3,
      messages: [
        {
          role: "system",
          content:
            "You are an audio transcription engine. Transcribe the audio content accurately. Provide a concise summary. Use the provided tool.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: { data: base64, format: mimeType.includes("wav") ? "wav" : "mp3" },
            },
            {
              type: "text",
              text: "Transcribe this audio and summarize it. Use the transcribe_audio tool.",
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "transcribe_audio",
            description: "Return transcription and summary from audio.",
            parameters: {
              type: "object",
              properties: {
                transcript: { type: "string", description: "Full transcription of the audio." },
                summary: { type: "string", description: "Concise 1-3 sentence summary." },
                language: { type: "string", description: "Detected language code, e.g. en." },
              },
              required: ["transcript", "summary", "language"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "transcribe_audio" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI returned no tool call for audio transcription");
  }

  const result = JSON.parse(toolCall.function.arguments);
  return {
    extracted_text: result.transcript || "",
    summary: result.summary || "Audio processed.",
    structured_json: {
      language: result.language ?? "unknown",
      transcript_length: (result.transcript || "").length,
    },
  };
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, captureId, userId } = await req.json();

    if (!attachmentId || !captureId || !userId) {
      return new Response(
        JSON.stringify({ error: "attachmentId, captureId, userId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AI_KEY = GEMINI_API_KEY || LOVABLE_API_KEY;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!AI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load attachment
    const { data: attachment, error: attErr } = await supabase
      .from("capture_attachments")
      .select("*")
      .eq("id", attachmentId)
      .eq("user_id", userId)
      .single();

    if (attErr || !attachment) {
      return new Response(
        JSON.stringify({ error: "Attachment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const kind = resolveKind(attachment.mime_type);

    // 2. Check/create extraction row
    const { data: existing } = await supabase
      .from("capture_attachment_extractions")
      .select("id, status")
      .eq("attachment_id", attachmentId)
      .maybeSingle();

    if (existing?.status === "processing" || existing?.status === "completed") {
      return new Response(
        JSON.stringify({ status: existing.status, message: "Already processed or in progress" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractionId = existing?.id;

    if (!extractionId) {
      const { data: newRow, error: insErr } = await supabase
        .from("capture_attachment_extractions")
        .insert({
          attachment_id: attachmentId,
          capture_id: captureId,
          user_id: userId,
          kind,
          status: kind === "other" ? "unsupported" : "pending",
        })
        .select("id")
        .single();

      if (insErr) {
        return new Response(
          JSON.stringify({ error: "Failed to create extraction row: " + insErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      extractionId = newRow.id;
    }

    if (kind === "other") {
      return new Response(
        JSON.stringify({ status: "unsupported", message: "File type not supported for extraction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Mark as processing
    await supabase
      .from("capture_attachment_extractions")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", extractionId);

    // 4. Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(attachment.storage_path);

    if (dlErr || !fileData) {
      await supabase
        .from("capture_attachment_extractions")
        .update({
          status: "failed",
          error_message: "Failed to download file: " + (dlErr?.message ?? "unknown"),
          completed_at: new Date().toISOString(),
        })
        .eq("id", extractionId);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());

    // 5. Route extraction by kind
    let result: { extracted_text: string; summary: string; structured_json: Record<string, unknown> };
    let provider = GEMINI_API_KEY ? "gemini-direct" : "lovable-ai";
    let model = GEMINI_API_KEY ? "gemini-flash-latest" : "google/gemini-2.5-flash";

    try {
      switch (kind) {
        case "image":
          result = await extractImage(fileBytes, attachment.mime_type || "image/jpeg", AI_KEY);
          break;
        case "pdf":
          result = await extractPdf(fileBytes, AI_KEY);
          break;
        case "audio":
          result = await extractAudio(fileBytes, attachment.mime_type || "audio/mpeg", AI_KEY);
          break;
        default:
          throw new Error("Unsupported kind: " + kind);
      }
    } catch (extractErr) {
      const errorMsg = extractErr instanceof Error ? extractErr.message : "Extraction failed";
      console.error("Extraction error:", errorMsg);

      await supabase
        .from("capture_attachment_extractions")
        .update({
          status: "failed",
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", extractionId);

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Save results
    await supabase
      .from("capture_attachment_extractions")
      .update({
        status: "completed",
        provider,
        model,
        extracted_text: result.extracted_text,
        summary: result.summary,
        structured_json: result.structured_json,
        completed_at: new Date().toISOString(),
      })
      .eq("id", extractionId);

    // Also update the parent attachment's extracted_text for quick access
    await supabase
      .from("capture_attachments")
      .update({
        extracted_text: result.extracted_text || null,
        status: "processed",
      })
      .eq("id", attachmentId);

    return new Response(
      JSON.stringify({
        status: "completed",
        extractionId,
        summary: result.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-capture-attachment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
