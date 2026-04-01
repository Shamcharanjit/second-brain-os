/**
 * Stripe Webhook handler — PLACEHOLDER / DORMANT.
 *
 * When STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are configured:
 *   - Verifies webhook signature
 *   - Handles: checkout.session.completed, customer.subscription.updated/deleted,
 *     invoice.payment_failed
 *   - Updates user_subscriptions table via service_role
 *
 * When not configured: returns 503.
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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Webhook not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: When Stripe is enabled:
    // 1. Read raw body + stripe-signature header
    // 2. Verify signature with webhookSecret
    // 3. Parse event type
    // 4. Handle events:
    //    - checkout.session.completed → upsert user_subscriptions (plan_tier=pro, status=active)
    //    - customer.subscription.updated → update status + current_period_end
    //    - customer.subscription.deleted → set plan_tier=free, status=canceled
    //    - invoice.payment_failed → set status=past_due
    // 5. Use service_role key for DB updates

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    return new Response(
      JSON.stringify({ received: true, status: "not_implemented" }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
