/**
 * Razorpay Webhook handler — PLACEHOLDER / DORMANT.
 *
 * When RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are configured:
 *   - Verifies webhook signature
 *   - Handles: subscription.activated, subscription.completed, subscription.cancelled
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
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!razorpayKeySecret || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay webhook not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: When Razorpay is enabled:
    // 1. Read raw body + x-razorpay-signature header
    // 2. Verify signature using HMAC SHA256 with webhookSecret
    // 3. Parse event type from payload.event
    // 4. Handle events:
    //    - subscription.activated → upsert user_subscriptions (plan_tier=pro, status=active)
    //    - subscription.completed → update status + current_period_end
    //    - subscription.cancelled → set plan_tier=free, status=canceled
    //    - payment.failed → set status=past_due
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
