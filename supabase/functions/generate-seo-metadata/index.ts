// Edge function: generate-seo-metadata
// Calls Lovable AI to produce title/description/keywords/faq for a given page.
// Stores result in public.seo_metadata (service-role).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { page_slug, page_content } = await req.json();
    if (!page_slug || typeof page_slug !== "string") {
      return new Response(JSON.stringify({ error: "page_slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support both GEMINI_API_KEY (Google AI Studio) and legacy LOVABLE_API_KEY
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AI_KEY = GEMINI_API_KEY || LOVABLE_API_KEY;
    if (!AI_KEY) throw new Error("AI not configured: set GEMINI_API_KEY in Supabase secrets");
    const AI_ENDPOINT = GEMINI_API_KEY
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = GEMINI_API_KEY ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    const aiRes = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an SEO expert for InsightHalo, an AI second brain app. Return concise, keyword-rich metadata.",
          },
          {
            role: "user",
            content: `Page slug: ${page_slug}\nContent: ${page_content || "(none)"}\nReturn SEO metadata.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_seo_metadata",
              description: "Return SEO metadata for the page",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "<60 char SEO title" },
                  description: { type: "string", description: "<160 char meta description" },
                  keywords: { type: "array", items: { type: "string" }, description: "5-8 keywords" },
                  faq: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { q: { type: "string" }, a: { type: "string" } },
                      required: ["q", "a"],
                    },
                  },
                },
                required: ["title", "description", "keywords"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_seo_metadata" } },
      }),
    });

    if (aiRes.status === 429 || aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: aiRes.status === 429 ? "Rate limited" : "Credits exhausted" }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiRes.ok) throw new Error(`AI error ${aiRes.status}`);

    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    if (!parsed?.title) throw new Error("AI returned no metadata");

    // Persist via service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase
      .from("seo_metadata")
      .upsert(
        {
          page_slug,
          title: parsed.title,
          description: parsed.description,
          keywords: parsed.keywords || [],
          ai_generated: true,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "page_slug" }
      );

    return new Response(JSON.stringify({ success: true, metadata: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-seo-metadata error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
