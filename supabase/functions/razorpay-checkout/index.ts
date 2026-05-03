/**
 * razorpay-checkout — Create a Razorpay Subscription for India billing.
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID        — Razorpay live/test key id  (rzp_live_xxx / rzp_test_xxx)
 *   RAZORPAY_KEY_SECRET    — Razorpay live/test key secret
 *   RAZORPAY_PLAN_ID       — Pre-created Razorpay plan id (plan_xxxxx)
 *
 * Flow:
 *   1. Verify Supabase JWT → get user.id + email
 *   2. POST /v1/subscriptions to Razorpay API
 *   3. Upsert user_subscriptions with provider ids + billing_region=india
 *   4. Return { subscriptionId, shortUrl } to client
 *
 * Client redirects window to shortUrl; Razorpay redirects back to callback_url after payment.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_API = "https://api.razorpay.com/v1";

// ── Basic auth for Razorpay REST API ────────────────────────────────────────
function razorpayBasicAuth(keyId: string, keySecret: string): string {
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

// ── Create Razorpay subscription ─────────────────────────────────────────────
async function createRzpSubscription(
  keyId: string,
  keySecret: string,
  planId: string,
  userEmail: string,
  callbackUrl: string,
): Promise<{ id: string; short_url: string }> {
  const res = await fetch(`${RAZORPAY_API}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: razorpayBasicAuth(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      // 120 billing cycles = 10 years — subscription auto-renews monthly
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notify_info: { notify_email: userEmail },
      // Razorpay redirects here after the hosted checkout is completed
      callback_url: callbackUrl,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg =
      data?.error?.description ||
      data?.error?.code ||
      `Razorpay API error ${res.status}`;
    throw new Error(errMsg);
  }

  return { id: data.id as string, short_url: data.short_url as string };
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const razorpayKeyId     = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const razorpayPlanId    = Deno.env.get("RAZORPAY_PLAN_ID");

    if (!razorpayKeyId || !razorpayKeySecret || !razorpayPlanId) {
      return new Response(
        JSON.stringify({ error: "Razorpay billing is not yet configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user session
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin client for DB writes (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse client body — returnUrl is optional
    const body = await req.json().catch(() => ({}));
    const returnUrl: string =
      typeof body.returnUrl === "string"
        ? body.returnUrl
        : "https://app.insighthalo.com/upgrade?checkout=success";

    // Create subscription on Razorpay
    const { id: rzpSubId, short_url: shortUrl } = await createRzpSubscription(
      razorpayKeyId,
      razorpayKeySecret,
      razorpayPlanId,
      user.email ?? "",
      returnUrl,
    );

    // Record pending subscription in DB (plan stays 'free' until webhook confirms payment)
    const { error: dbError } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          billing_provider: "razorpay",
          provider_subscription_id: rzpSubId,
          billing_region: "india",
          subscription_status: "incomplete",
          plan_tier: "free",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (dbError) {
      // Non-fatal — log but still return shortUrl so checkout can proceed
      console.error("user_subscriptions upsert error:", JSON.stringify(dbError));
    }

    return new Response(
      JSON.stringify({ subscriptionId: rzpSubId, shortUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("razorpay-checkout error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
