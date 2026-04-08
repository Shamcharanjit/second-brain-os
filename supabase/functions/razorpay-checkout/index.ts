/**
 * Razorpay Checkout edge function — PLACEHOLDER / DORMANT.
 *
 * When RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured:
 *   - Creates a Razorpay Subscription for the authenticated user
 *   - Returns { subscriptionId, shortUrl } for client redirect
 *
 * When not configured:
 *   - Returns 503 with friendly message
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Billing is not yet configured for India region." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { returnUrl } = await req.json();

    // TODO: When Razorpay is enabled:
    // 1. Find or create Razorpay customer for user.email
    // 2. Create subscription with plan_id
    // 3. Upsert user_subscriptions with provider_customer_id, billing_provider='razorpay'
    // 4. Return { subscriptionId, shortUrl }

    return new Response(
      JSON.stringify({ error: "Razorpay checkout not yet implemented. Keys are present but flow is pending." }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
