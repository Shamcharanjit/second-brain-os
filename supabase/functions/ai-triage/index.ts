import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are InsightHalo's capture intelligence engine. You classify raw user thoughts into structured data.

Given a raw capture, call the "triage_capture" function with the structured output. Be concise. Do not explain yourself.

Classification rules:
- "task": actionable item the user needs to do
- "idea": creative concept, business idea, product idea, exploration
- "reminder": time-sensitive thing to remember
- "goal": long-term objective or milestone
- "note": reference information, observation, FYI
- "project": multi-step initiative
- "follow_up": waiting on someone else, needs checking back
- "maybe_later": explicitly low priority / someday

Destination rules:
- "today": urgent tasks, reminders due today, high-priority follow-ups
- "inbox": ambiguous items, moderate tasks, things needing review
- "ideas": creative ideas, product concepts, explorations
- "projects": multi-step initiatives, system builds
- "memory": important reference notes worth remembering long-term
- "someday": explicitly deferred, low priority

Priority rules:
- "high": urgent, time-sensitive, critical
- "medium": important but not urgent
- "low": nice to have, someday, reference

Generate a clean title (max 8 words, no filler). Summary should be 1 sentence max.
suggestedNextAction should be a concrete single next step (max 10 words).
shouldAddToToday = true only if genuinely urgent or due today.
confidence: 0-1 float, how confident you are in the classification.`;

const TRIAGE_TOOL = {
  type: "function",
  function: {
    name: "triage_capture",
    description: "Classify and structure a raw user capture.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["task", "idea", "reminder", "goal", "note", "project", "follow_up", "maybe_later"],
        },
        title: { type: "string", description: "Clean title, max 8 words" },
        summary: { type: "string", description: "One sentence summary" },
        recommendedDestination: {
          type: "string",
          enum: ["today", "inbox", "ideas", "projects", "memory", "someday"],
        },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        shouldAddToToday: { type: "boolean" },
        suggestedNextAction: { type: "string", description: "Concrete next step, max 10 words" },
        confidence: { type: "number", description: "0-1 confidence score" },
      },
      required: ["type", "title", "summary", "recommendedDestination", "priority", "shouldAddToToday", "suggestedNextAction", "confidence"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawInput, enrichedContext } = await req.json();
    if (!rawInput || typeof rawInput !== "string") {
      return new Response(JSON.stringify({ error: "rawInput is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user message: use enriched context if available, otherwise raw input
    const hasEnrichment = enrichedContext && typeof enrichedContext === "string" && enrichedContext !== rawInput;
    let userMessage = rawInput;
    if (hasEnrichment) {
      userMessage = enrichedContext + "\n\nIMPORTANT: The user's original typed text is the primary intent signal. Attachment-derived content is supporting context only. Do not hallucinate beyond what is explicitly present in the text or extracted content.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [TRIAGE_TOOL],
        tool_choice: { type: "function", function: { name: "triage_capture" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triage = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ triage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-triage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
