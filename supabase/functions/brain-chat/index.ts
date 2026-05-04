/**
 * brain-chat — Conversational AI over the user's second brain.
 *
 * Accepts: { message: string, history: {role,content}[] }
 * Builds context from user's captures, memories, projects then calls Gemini.
 * Returns: { reply: string }
 *
 * Context budget:
 *   - Last 40 captures (title + raw_input + category + tags)
 *   - All active projects (name + description + next actions)
 *   - Last 30 memories (title + summary + type)
 *   - Completed tasks this week
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the user's personal second-brain assistant built into InsightHalo.
You have access to their captures, projects, memories, and habits.
Answer questions conversationally, referencing their actual data when relevant.
Be concise (2-4 sentences unless detail is asked for), specific, and actionable.
If you cannot find relevant information in their data, say so honestly.
Never make up captures, projects or memories that don't exist in the context.
Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

type Row = Record<string, unknown>;

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }

async function buildContext(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const parts: string[] = [];

  // Captures
  const { data: caps } = await supabase
    .from("captures")
    .select("raw_input, ai_data, status, created_at, is_completed")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(40);

  if (caps?.length) {
    parts.push("=== CAPTURES (recent 40) ===");
    for (const c of caps as Row[]) {
      const ai = c.ai_data as Record<string, unknown> | null;
      const title = (ai?.title as string) || truncate(c.raw_input as string, 60);
      const cat = (ai?.category as string) || "?";
      const tags = ((ai?.tags as string[]) || []).slice(0, 3).join(", ");
      const done = c.is_completed ? " [DONE]" : "";
      const date = (c.created_at as string)?.slice(0, 10) ?? "";
      parts.push(`- [${cat}]${done} ${title}${tags ? ` (${tags})` : ""} — ${date}`);
    }
  }

  // Projects
  const { data: projs } = await supabase
    .from("projects")
    .select("name, description, status, priority, next_actions, progress")
    .eq("user_id", userId)
    .in("status", ["active", "planning"])
    .limit(20);

  if (projs?.length) {
    parts.push("\n=== ACTIVE PROJECTS ===");
    for (const p of projs as Row[]) {
      const actions = (p.next_actions as Row[])?.filter((a) => !a.is_completed).slice(0, 3).map((a) => a.text as string) ?? [];
      parts.push(`- [${p.priority}] ${p.name}: ${truncate((p.description as string) ?? "", 80)} — Progress: ${p.progress}%`);
      if (actions.length) parts.push(`  Next: ${actions.join(" | ")}`);
    }
  }

  // Memories
  const { data: mems } = await supabase
    .from("memories")
    .select("title, summary, memory_type, tags, importance_score")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("importance_score", { ascending: false })
    .limit(30);

  if (mems?.length) {
    parts.push("\n=== MEMORIES ===");
    for (const m of mems as Row[]) {
      const summary = truncate((m.summary as string) ?? (m.title as string), 100);
      parts.push(`- [${m.memory_type}] ${m.title}: ${summary}`);
    }
  }

  return parts.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Support both GEMINI_API_KEY (Google AI Studio) and legacy LOVABLE_API_KEY
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AI_KEY = GEMINI_API_KEY || LOVABLE_API_KEY;
    if (!AI_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const AI_ENDPOINT = GEMINI_API_KEY
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = GEMINI_API_KEY ? "gemini-flash-latest" : "google/gemini-3-flash-preview";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const message: string = body.message ?? "";
    const history: { role: string; content: string }[] = body.history ?? [];

    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build brain context
    const context = await buildContext(supabase, user.id);

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
      ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const resp = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: 800 }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Gemini error ${resp.status}: ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("brain-chat error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
