/**
 * generate-embedding-query
 *
 * Generates a text embedding for a search query (does NOT store it).
 * Used by the semantic search flow on the Memory page.
 *
 * POST body: { text: string }
 * Returns:   { embedding: number[] }
 *
 * Auth: requires user JWT.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) return null;
  const res = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text.slice(0, 2000) }] },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.embedding?.values ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json() as { text: string };
    if (!text?.trim()) {
      return Response.json({ error: "text required" }, { status: 400, headers: corsHeaders });
    }

    const embedding = await generateEmbedding(text.trim());
    if (!embedding) {
      return Response.json({ error: "Embedding generation failed" }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ embedding }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
