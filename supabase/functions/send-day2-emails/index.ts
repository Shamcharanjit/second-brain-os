/**
 * send-day2-emails
 *
 * Called daily by GitHub Actions cron job.
 * Targets users who activated 44–52 hours ago and still have ≤ 1 capture.
 * Sends a "daily ritual" nudge — shows them how the 2-minute review works.
 *
 * Safe to run multiple times — tracks sent emails via
 * activation_funnel_events (event_type: 'day2_email_sent').
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
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">The most effective people I know don't have better memories — they have better systems.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">InsightHalo is built around one habit: a <strong style="color:#f9fafb;">2-minute daily review</strong>. You capture things as they happen, then once a day you scan what AI organised for you, approve or adjust, and route what matters to Today.</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">That's it. Two minutes. You stop losing things, stop forgetting, stop feeling overwhelmed.</p>
        </td></tr>

        <!-- Steps -->
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:12px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width:24px;height:24px;background-color:#10b981;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">1</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">Capture</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Any thought, task, or idea — takes 10 seconds</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:12px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width:24px;height:24px;background-color:#10b981;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">2</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">AI organises it</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Tags, priority score, next action — automatically</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:12px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="32" valign="top">
                      <div style="width:24px;height:24px;background-color:#10b981;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">3</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">2-minute review</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Approve AI decisions, route important items to Today</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:32px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#10b981;border-radius:8px;">
              <a href="https://insighthalo.com/app" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Start my 2-minute review →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:32px 32px 16px;">
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

The most effective people don't have better memories — they have better systems.

InsightHalo is built around one habit: a 2-minute daily review.

1. Capture — any thought, task, or idea. Takes 10 seconds.
2. AI organises it — tags, priority score, next action automatically.
3. 2-minute review — approve AI decisions, route important items to Today.

That's it. You stop losing things, stop forgetting, stop feeling overwhelmed.

Start your review: https://insighthalo.com/app

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
    `Subject: The 2-minute habit that keeps your brain clear`,
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

  await read(); // server greeting
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
    // Find waitlist signups that:
    // - activated 44–52 hours ago (day-2 window)
    // - have NOT yet been sent a day-2 email
    const now = new Date();
    const windowStart = new Date(now.getTime() - 52 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() - 44 * 60 * 60 * 1000).toISOString();

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
      console.log("No candidates in day-2 window");
      return Response.json({ success: true, sent: 0, skipped: 0 }, { headers: corsHeaders });
    }

    // Filter out anyone who already received a day-2 email
    const { data: alreadySent } = await supabase
      .from("activation_funnel_events")
      .select("waitlist_signup_email")
      .eq("event_type", "day2_email_sent")
      .in("waitlist_signup_email", candidates.map((c) => c.email));

    const alreadySentSet = new Set((alreadySent || []).map((r) => r.waitlist_signup_email));

    let sent = 0;
    let skipped = 0;

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    for (const candidate of candidates) {
      if (alreadySentSet.has(candidate.email)) {
        skipped++;
        continue;
      }

      if (!smtpUser || !smtpPass) {
        console.error("SMTP credentials missing");
        break;
      }

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
            event_type: "day2_email_sent",
            event_source: "send-day2-emails",
          });
          console.log(`Day-2 email sent to ${candidate.email}`);
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
    console.error("send-day2-emails error:", err);
    return Response.json({ success: false, error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
