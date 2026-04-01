/**
 * AI Project Assist edge function.
 *
 * Supports 3 actions: suggest_next_step, break_into_steps, find_blocker
 * Uses Lovable AI gateway with structured tool calling.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL_DEFS: Record<string, any> = {
  suggest_next_step: {
    type: "function",
    function: {
      name: "suggest_next_step",
      description: "Suggest the single most impactful next action for this project.",
      parameters: {
        type: "object",
        properties: {
          next_step: { type: "string", description: "A clear, actionable next step" },
          reasoning: { type: "string", description: "Brief explanation of why this step matters" },
        },
        required: ["next_step", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  break_into_steps: {
    type: "function",
    function: {
      name: "break_into_steps",
      description: "Break this project into 3 small, actionable steps.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "string", description: "A clear, actionable step" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["step", "priority"],
              additionalProperties: false,
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["steps"],
        additionalProperties: false,
      },
    },
  },
  find_blocker: {
    type: "function",
    function: {
      name: "find_blocker",
      description: "Identify the most likely blocker preventing progress on this project.",
      parameters: {
        type: "object",
        properties: {
          blocker: { type: "string", description: "The most likely blocker" },
          suggestion: { type: "string", description: "How to overcome this blocker" },
        },
        required: ["blocker", "suggestion"],
        additionalProperties: false,
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, project_name, project_description, existing_actions } = await req.json();

    if (!action || !project_name) {
      return new Response(JSON.stringify({ error: "action and project_name are required" }), {
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

    const toolDef = TOOL_DEFS[action];
    if (!toolDef) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionsText = existing_actions?.length
      ? `\nExisting next actions:\n${existing_actions.map((a: string) => `- ${a}`).join("\n")}`
      : "\nNo existing next actions yet.";

    const systemPrompt = `You are an AI project intelligence assistant for a personal productivity app called InsightHalo. You help users move projects forward with clear, actionable guidance. Be concise and practical. Focus on the single most impactful thing.`;

    const userPrompt = `Project: "${project_name}"
Description: ${project_description || "No description provided."}
${actionsText}

Provide your ${action.replace(/_/g, " ")} analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: action } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

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

      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ action, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("project-assist error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
