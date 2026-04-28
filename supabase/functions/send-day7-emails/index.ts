/**
 * send-day7-emails
 *
 * Called daily by GitHub Actions cron job.
 * Targets users who activated 160–172 hours ago (~7 days).
 * Sends a "weekly habit" email — introduces the Review ritual and
 * power features (voice, projects) to deepen engagement.
 *
 * Safe to run multiple times — dedupes via activation_funnel_events
 * (event_type: 'day7_email_sent').
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME = "InsightHalo";

function buildHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
        <tr><td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:32px 32px 0;">
          <span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span>
        </td></tr>
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">Hey ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">One week in. That's the first milestone.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">Users who make it to week one tend to stick around — because the system starts paying off. Your captures are in there. Your AI tags are working. Now it's time to run your first <strong style="color:#f9fafb;">Weekly Review</strong>.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#d1d5db;">It takes 5 minutes. Here's what it does:</p>
        </td></tr>

        <!-- Review steps -->
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:12px;border:1px solid #1f2937;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#10b981;">① Clear your Inbox</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Review everything AI captured this week. Approve tags, adjust priorities, route what matters.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#10b981;">② Check your Projects</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">See which projects are active, what's blocked, and what needs a next action this week.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#10b981;">③ Set your week</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Pin 1–3 items to Today. That's your focus for the coming week.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:32px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#10b981;border-radius:8px;">
              <a href="https://insighthalo.com/app/review" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Start Weekly Review →</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Power features callout -->
        <tr><td style="padding:28px 32px 0;">
          <div style="border-top:1px solid #1f2937;padding-top:24px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#d1d5db;">Two features worth trying this week:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 12px;background-color:#0f172a;border-radius:8px;border:1px solid #1f2937;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">🎙️ Voice capture</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Speak a thought instead of typing it. Great when your hands are busy.</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:10px 12px;background-color:#0f172a;border-radius:8px;border:1px solid #1f2937;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">📁 Projects</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Group related captures into a project. AI links new captures automatically.</p>
                </td>
              </tr>
            </table>
          </div>
        </td></tr>

        <tr><td style="padding:24px 32px 32px;">
          <div style="border-top:1px solid #1f2937;padding-top:24px;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">&mdash; Shamcharan, InsightHalo</p>
            <p style="margin:0;font-size:13px;color:#6b7280;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(firstName: string): string {
  return `Hey ${firstName},

One week in. That's the first milestone.

Users who make it to week one tend to stick around — because the system starts paying off. Now it's time to run your first Weekly Review.

It takes 5 minutes:

① Clear your Inbox — review AI captures, approve tags, route what matters
② Check your Projects — see what's blocked, what needs a next action
③ Set your week — pin 1-3 items to Today as your focus

Start Weekly Review: https://insighthalo.com/app/review

Two features worth trying this week:
- Voice capture: speak a thought instead of typing
- Projects: group captures, AI links new ones automatically

— Shamcharan, InsightHalo
support@insighthalo.com`;
}

async function sendEmail(
  conn: Deno.TlsConn,
  email: string,
  firstName: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const read = async () => {
    const b = new Uint8Array(8192);
    const n = await conn.read(b);
    return n ? dec.decode(b.subarray(0, n)) : "";
  };
  const send = async (cmd: string) => {
    await conn.write(enc.encode(cmd + "\r\n"));
    return read();
  };

  const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
  const mime = [
    `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
    `To: ${email}`,
    `Subject: One week in — run your first Weekly Review`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    buildText(firstName),
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    buildHtml(firstName),
    `--${boundary}--`,
  ].join("\r\n");

  await read();
  await send(`EHLO insighthalo.com`);
  await send(`AUTH LOGIN`);
  await send(btoa(Deno.env.get("SMTP_USER")!));
  const authResp = await send(btoa(Deno.env.get("SMTP_PASS")!));
  if (!authResp.startsWith("235")) return false;

  await send(`MAIL FROM:<${SENDER_EMAIL}>`);
  await send(`RCPT TO:<${email}>`);
  await send(`DATA`);
  const dataResp = await send(mime + "\r\n.");
  await send(`QUIT`);

  return dataResp.startsWith("250");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Day-7 window: 160–172 hours after activation
    const now = new Date();
    const windowStart = new Date(now.getTime() - 172 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() - 160 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error } = await supabase
      .from("waitlist_signups")
      .select("email, name, activation_completed_at")
      .eq("status", "activated")
      .gte("activation_completed_at", windowStart)
      .lte("activation_completed_at", windowEnd);

    if (error) {
      console.error("DB query failed:", error);
      return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }

    if (!candidates || candidates.length === 0) {
      console.log("No candidates in day-7 window");
      return Response.json({ success: true, sent: 0, skipped: 0 }, { headers: corsHeaders });
    }

    const { data: alreadySent } = await supabase
      .from("activation_funnel_events")
      .select("waitlist_signup_email")
      .eq("event_type", "day7_email_sent")
      .in("waitlist_signup_email", candidates.map((c) => c.email));

    const alreadySentSet = new Set((alreadySent || []).map((r) => r.waitlist_signup_email));

    let sent = 0;
    let skipped = 0;
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    for (const candidate of candidates) {
      if (alreadySentSet.has(candidate.email)) { skipped++; continue; }
      if (!smtpUser || !smtpPass) { console.error("SMTP credentials missing"); break; }

      const firstName = (() => {
        const raw = candidate.name || candidate.email.split("@")[0] || "there";
        const word = raw.replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
        return word.charAt(0).toUpperCase() + word.slice(1);
      })();

      try {
        const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
        const ok = await sendEmail(conn, candidate.email, firstName);
        conn.close();

        if (ok) {
          await supabase.from("activation_funnel_events").insert({
            waitlist_signup_email: candidate.email,
            event_type: "day7_email_sent",
            event_source: "send-day7-emails",
          });
          console.log(`Day-7 email sent to ${candidate.email}`);
          sent++;
        } else {
          console.error(`SMTP rejected email to ${candidate.email}`);
        }
      } catch (emailErr) {
        console.error(`Failed to send to ${candidate.email}:`, emailErr);
      }
    }

    return Response.json(
      { success: true, sent, skipped, total: candidates.length },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("send-day7-emails error:", err);
    return Response.json({ success: false, error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
