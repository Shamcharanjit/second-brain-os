/**
 * Stripe Customer Portal edge function — PLACEHOLDER / DORMANT.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // TODO: When Stripe is enabled:
    // 1. Verify user JWT
    // 2. Look up provider_customer_id from user_subscriptions
    // 3. Create portal session via Stripe SDK
    // 4. Return { url: session.url }

    return new Response(
      JSON.stringify({ error: "Portal not yet implemented." }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
