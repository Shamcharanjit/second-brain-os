import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response(
        JSON.stringify({ valid: false, email: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("email, invited, invite_sent_at, activation_completed_at")
      .eq("invite_token", token.trim())
      .eq("invited", true)
      .not("invite_sent_at", "is", null)
      .is("activation_completed_at", null)
      .maybeSingle();

    if (error) {
      console.error("[check-invite-token] DB error:", error);
      return new Response(
        JSON.stringify({ valid: false, email: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      console.log("[check-invite-token] No matching row for token");
      return new Response(
        JSON.stringify({ valid: false, email: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record invite_opened_at on first token check
    await supabase
      .from("waitlist_signups")
      .update({ invite_opened_at: new Date().toISOString() })
      .eq("invite_token", token.trim())
      .is("invite_opened_at", null);

    console.log("[check-invite-token] Valid token for:", data.email);

    return new Response(
      JSON.stringify({ valid: true, email: data.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[check-invite-token] Exception:", err);
    return new Response(
      JSON.stringify({ valid: false, email: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
