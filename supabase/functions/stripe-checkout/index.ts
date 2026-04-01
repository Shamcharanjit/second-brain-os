/**
 * Stripe Checkout edge function — PLACEHOLDER / DORMANT.
 *
 * When STRIPE_SECRET_KEY is configured:
 *   - Creates a Stripe Checkout Session for the authenticated user
 *   - Returns { url } for client redirect
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Billing is not yet configured." }),
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

    const { returnUrl, cancelUrl } = await req.json();

    // TODO: When Stripe is enabled, create checkout session here:
    // const stripe = new Stripe(stripeKey);
    // 1. Find or create Stripe customer for user.email
    // 2. Create checkout session with price ID
    // 3. Upsert user_subscriptions with provider_customer_id
    // 4. Return { url: session.url }

    return new Response(
      JSON.stringify({ error: "Checkout not yet implemented. Stripe key is present but flow is pending." }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
