/**
 * generate-embedding
 *
 * Generates a text embedding for a given string using the Gemini
 * text-embedding-004 model (768 dimensions) and stores it in user_memory_entries.
 *
 * POST body: { memory_id: string, text: string }
 * Returns:   { success: boolean, dims?: number }
 *
 * Called by the client after saving a memory entry.
 * Auth: requires user JWT (validates via supabase client).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set");
    return null;
  }
  const res = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });
  if (!res.ok) {
    console.error("Gemini embedding error", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data?.embedding?.values ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Verify user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { memory_id, text } = body as { memory_id: string; text: string };

    if (!memory_id || !text) {
      return Response.json({ success: false, error: "memory_id and text required" }, { status: 400, headers: corsHeaders });
    }

    // Verify the memory belongs to this user
    const { data: mem, error: memError } = await supabase
      .from("user_memory_entries")
      .select("id")
      .eq("id", memory_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !mem) {
      return Response.json({ success: false, error: "Memory not found" }, { status: 404, headers: corsHeaders });
    }

    const embedding = await generateEmbedding(text);
    if (!embedding) {
      return Response.json({ success: false, error: "Embedding generation failed" }, { status: 500, headers: corsHeaders });
    }

    // Store using service role to bypass any column restrictions
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: updateError } = await serviceClient
      .from("user_memory_entries")
      .update({ embedding: `[${embedding.join(",")}]` })
      .eq("id", memory_id);

    if (updateError) {
      console.error("Failed to store embedding:", updateError);
      return Response.json({ success: false, error: updateError.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ success: true, dims: embedding.length }, { headers: corsHeaders });
  } catch (err) {
    console.error("generate-embedding error:", err);
    return Response.json({ success: false, error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
