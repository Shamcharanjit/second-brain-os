/**
 * send-day3-emails
 *
 * Called daily by GitHub Actions cron.
 * Targets users who activated 68–76 hours ago.
 * Angle: "Your AI has been busy — here's what's waiting in your Inbox."
 * Shows them the Inbox value they may not have discovered yet.
 *
 * Safe to run multiple times — deduped via activation_funnel_events
 * (event_type: 'day3_email_sent').
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST    = "smtp.hostinger.com";
const SMTP_PORT    = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME  = "InsightHalo";

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
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">While you've been busy, your AI has been quietly organizing everything you've captured so far.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">It's categorized your thoughts, assigned priorities, suggested next actions, and routed things to the right place — all without you lifting a finger.</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">Your <strong style="color:#f9fafb;">Inbox</strong> is where all of that surfaces. This is your command center — it's where 2 minutes a day changes everything.</p>
        </td></tr>

        <!-- What the Inbox does -->
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:12px;border:1px solid #1f2937;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#10b981;">What to do in your Inbox</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">✓ Review AI decisions</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">See how your thought was tagged, prioritized, and where AI wants to send it.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">✓ Approve or adjust</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">One tap to approve. Or edit the category, change the destination, add a next action.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb;">✓ Route to Today</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Anything urgent gets pinned to Today — your daily focus list. That's where work gets done.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Pro tip -->
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#052e1c;border-radius:10px;border:1px solid #065f46;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#10b981;">💡 Pro tip: try voice capture</p>
                <p style="margin:6px 0 0;font-size:12px;color:#6ee7b7;line-height:1.6;">Tap the mic icon and speak naturally. Your thought is transcribed, AI-organized, and in your Inbox in seconds. Great for when you're driving or walking.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:28px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#10b981;border-radius:8px;">
              <a href="https://insighthalo.com/inbox" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Open my Inbox →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:28px 32px 16px;">
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

While you've been busy, your AI has been quietly organizing everything you've captured so far.

It's categorized your thoughts, assigned priorities, suggested next actions, and routed things to the right place — all without you lifting a finger.

Your Inbox is where all of that surfaces. This is your command center.

What to do in your Inbox:
• Review AI decisions — see how your thought was tagged and prioritized
• Approve or adjust — one tap to approve, or edit the category
• Route to Today — pin urgent items to your daily focus list

💡 Pro tip: try voice capture. Tap the mic and speak naturally — transcribed and organized in seconds.

Open your Inbox: https://insighthalo.com/inbox

— Shamcharan, InsightHalo
support@insighthalo.com`;
}

async function sendEmail(conn: Deno.TlsConn, email: string, firstName: string): Promise<boolean> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const read = async () => { const b = new Uint8Array(8192); const n = await conn.read(b); return n ? dec.decode(b.subarray(0, n)) : ""; };
  const send = async (cmd: string) => { await conn.write(enc.encode(cmd + "\r\n")); return read(); };

  const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
  const mime = [
    `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
    `To: ${email}`,
    `Subject: Your AI has been busy — check your Inbox`,
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 76 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() - 68 * 60 * 60 * 1000).toISOString();

    // Users who activated 68–76 hours ago
    const { data: candidates, error } = await supabase
      .from("waitlist_signups")
      .select("email, name, activation_completed_at")
      .eq("status", "activated")
      .gte("activation_completed_at", windowStart)
      .lte("activation_completed_at", windowEnd);

    if (error) {
      console.error("DB error:", error);
      return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }

    if (!candidates || candidates.length === 0) {
      return Response.json({ success: true, sent: 0, skipped: 0 }, { headers: corsHeaders });
    }

    // Dedupe: skip anyone who already got day3
    const { data: alreadySent } = await supabase
      .from("activation_funnel_events")
      .select("waitlist_signup_email")
      .eq("event_type", "day3_email_sent")
      .in("waitlist_signup_email", candidates.map((c) => c.email));

    const alreadySentSet = new Set((alreadySent ?? []).map((r) => r.waitlist_signup_email));

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    let sent = 0; let skipped = 0;

    for (const candidate of candidates) {
      if (alreadySentSet.has(candidate.email)) { skipped++; continue; }
      if (!smtpUser || !smtpPass) { console.error("SMTP creds missing"); break; }

      const rawName = candidate.name || candidate.email.split("@")[0] || "there";
      const firstName = rawName.replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
      const capitalised = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      try {
        const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
        const ok = await sendEmail(conn, candidate.email, capitalised);
        conn.close();

        if (ok) {
          await supabase.from("activation_funnel_events").insert({
            waitlist_signup_email: candidate.email,
            event_type: "day3_email_sent",
            event_source: "send-day3-emails",
          });
          console.log(`Day-3 email sent to ${candidate.email}`);
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Failed to send to ${candidate.email}:`, err);
        skipped++;
      }
    }

    return Response.json({ success: true, sent, skipped, total: candidates.length }, { headers: corsHeaders });
  } catch (err) {
    console.error("send-day3-emails error:", err);
    return Response.json({ success: false, error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
