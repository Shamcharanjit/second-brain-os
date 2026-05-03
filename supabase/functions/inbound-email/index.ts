/**
 * inbound-email — Receives forwarded emails and creates captures.
 *
 * Compatible with Resend inbound webhook format (also works with Postmark/Mailgun
 * by adjusting field names in the parser).
 *
 * Setup:
 *   1. Add a custom domain (e.g. capture.insighthalo.com) in Resend/Postmark
 *   2. Point MX record to the email provider
 *   3. Set the inbound webhook URL to this edge function
 *   4. User's capture address: capture+<token>@capture.insighthalo.com
 *
 * Env vars needed:
 *   INBOUND_EMAIL_SECRET  — webhook secret to verify requests
 *   SUPABASE_SERVICE_ROLE_KEY — for DB writes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function extractToken(toAddress: string): string | null {
  // Handles: capture+TOKEN@domain or TOKEN@domain
  const plusMatch = toAddress.match(/\+([^@]+)@/);
  if (plusMatch) return plusMatch[1];
  const atMatch = toAddress.match(/^([^@]+)@/);
  return atMatch ? atMatch[1] : null;
}

function cleanEmailBody(text: string): string {
  // Remove common email reply headers and trim
  return text
    .replace(/^On .+wrote:$/gm, "")
    .replace(/^>.*$/gm, "")
    .replace(/^[-_]{3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000); // max 5K chars
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const inboundSecret = Deno.env.get("INBOUND_EMAIL_SECRET");
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Optional webhook secret verification
    if (inboundSecret) {
      const provided = req.headers.get("x-webhook-secret") ?? req.headers.get("x-resend-signature");
      if (provided !== inboundSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
    }

    const payload = await req.json();

    // Resend inbound format
    const to: string   = payload.to ?? payload.To ?? "";
    const from: string = payload.from ?? payload.From ?? "";
    const subject: string = payload.subject ?? payload.Subject ?? "(no subject)";
    const text: string = payload.text ?? payload.TextBody ?? payload.body ?? "";
    const html: string = payload.html ?? payload.HtmlBody ?? "";

    // Extract body — prefer text, fall back to stripping HTML
    const rawBody = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const body = cleanEmailBody(rawBody);

    const token = extractToken(to);
    if (!token) {
      return new Response(JSON.stringify({ error: "Could not parse token from address" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up user by token
    const { data: emailRow } = await admin
      .from("user_capture_emails")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (!emailRow) {
      return new Response(JSON.stringify({ error: "Unknown token" }), { status: 404, headers: corsHeaders });
    }

    const userId = emailRow.user_id as string;

    // Build capture text
    const captureText = subject !== "(no subject)"
      ? `📧 ${subject}\n\nFrom: ${from}\n\n${body}`
      : `📧 From: ${from}\n\n${body}`;

    // Insert capture
    await admin.from("captures").insert({
      user_id:      userId,
      raw_input:    captureText.slice(0, 5000),
      input_type:   "email",
      status:       "processed",
      review_status: "needs_review",
      source:       "email",
      created_at:   new Date().toISOString(),
    });

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("inbound-email error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
