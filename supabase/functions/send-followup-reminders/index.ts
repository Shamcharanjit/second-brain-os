const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME = "InsightHalo";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapEmail(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
<tr><td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 32px 0 32px;"><span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span></td></tr>
${content}
<tr><td style="padding:36px 32px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #1f2937;padding-top:24px;">
<p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">&mdash; Team InsightHalo</p>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
}

function buildWaitlistReminderHtml(name: string, referralCode: string): string {
  const referralLink = `https://insighthalo.com/waitlist?ref=${referralCode}`;
  return wrapEmail(`
<tr><td align="center" style="padding:28px 32px 0 32px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Still waiting for early access?</h1></td></tr>
<tr><td align="center" style="padding:20px 32px 0 32px;"><div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div></td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">You're still on the InsightHalo early access waitlist. We're inviting users gradually &mdash; and you can move up the queue by sharing your personal referral link.</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Every referral boosts your priority and unlocks rewards like fast-track invites and insider access.</p>
</td></tr>
<tr><td align="center" style="padding:24px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#10b981;border-radius:8px;">
<a href="${referralLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Share Your Referral Link</a>
</td></tr></table></td></tr>
<tr><td style="padding:16px 32px 0 32px;"><p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">Your link: <a href="${referralLink}" style="color:#10b981;text-decoration:underline;">${referralLink}</a></p></td></tr>`,
  `You're still on the InsightHalo waitlist — share your link to move up!`);
}

function buildInviteReminderHtml(name: string, inviteLink: string): string {
  return wrapEmail(`
<tr><td align="center" style="padding:28px 32px 0 32px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Your access is waiting</h1></td></tr>
<tr><td align="center" style="padding:20px 32px 0 32px;"><div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div></td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">You've been invited to InsightHalo early access, but we noticed you haven't activated your account yet.</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Your invite is still active. Click below to get started building your second brain.</p>
</td></tr>
<tr><td align="center" style="padding:24px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#10b981;border-radius:8px;">
<a href="${inviteLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Activate Your Account</a>
</td></tr></table></td></tr>`,
  `Your InsightHalo access is waiting — activate now`);
}

function buildActivationReminderHtml(name: string): string {
  return wrapEmail(`
<tr><td align="center" style="padding:28px 32px 0 32px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Start building your second brain</h1></td></tr>
<tr><td align="center" style="padding:20px 32px 0 32px;"><div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div></td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name || "there")},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Welcome to InsightHalo! We noticed you haven't started using the app yet. Here are some quick ways to get going:</p>
<ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;line-height:1.7;color:#d1d5db;">
<li><strong style="color:#f9fafb;">Capture your first thought</strong> &mdash; just type or speak an idea</li>
<li><strong style="color:#f9fafb;">Create a project</strong> &mdash; organize your goals and next actions</li>
<li><strong style="color:#f9fafb;">Save a memory</strong> &mdash; store insights you want to revisit</li>
</ul>
<p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">It takes less than a minute to start.</p>
</td></tr>
<tr><td align="center" style="padding:24px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#10b981;border-radius:8px;">
<a href="https://insighthalo.com/app" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open InsightHalo</a>
</td></tr></table></td></tr>`,
  `Start building your second brain with InsightHalo`);
}

async function sendEmail(conn: Deno.TlsConn, to: string, subject: string, html: string, smtpUser: string, smtpPass: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResp(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    if (n === null) throw new Error("Connection closed");
    return decoder.decode(buf.subarray(0, n));
  }

  async function sendCmd(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResp();
  }

  try {
    await readResp();
    await sendCmd("EHLO insighthalo.com");
    await sendCmd("AUTH LOGIN");
    await sendCmd(btoa(smtpUser));
    const authResp = await sendCmd(btoa(smtpPass));
    if (!authResp.startsWith("235")) throw new Error(`Auth failed: ${authResp}`);

    const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
    const mime = [
      `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``, `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``, `Please view this email in an HTML-capable client.`,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``, html,
      `--${boundary}--`,
    ].join("\r\n");

    await sendCmd(`MAIL FROM:<${SENDER_EMAIL}>`);
    await sendCmd(`RCPT TO:<${to}>`);
    await sendCmd("DATA");
    const dataResp = await sendCmd(mime + "\r\n.");
    if (!dataResp.startsWith("250")) throw new Error(`Send failed: ${dataResp}`);
    await sendCmd("QUIT");
    return true;
  } catch (err) {
    console.error(`Failed to send to ${to}:`, err);
    return false;
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, supabaseKey);
    const now = new Date();
    const results = { waitlist: 0, invite: 0, activation: 0, errors: 0 };

    // FLOW 1: Waitlist reminder — pending, not invited, created > 3 days ago, no reminder in last 5 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: waitlistUsers } = await sb
      .from("waitlist_signups")
      .select("id, name, email, referral_code, last_reminder_sent_at, created_at")
      .eq("status", "pending")
      .eq("invited", false)
      .lt("created_at", threeDaysAgo);

    for (const u of (waitlistUsers || [])) {
      if (u.last_reminder_sent_at && new Date(u.last_reminder_sent_at) > new Date(fiveDaysAgo)) continue;
      if (!u.referral_code) continue;

      const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
      const ok = await sendEmail(conn, u.email, "Still waiting for InsightHalo early access?",
        buildWaitlistReminderHtml(u.name, u.referral_code), smtpUser, smtpPass);
      conn.close();

      if (ok) {
        await sb.from("waitlist_signups").update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: (u as any).reminder_count ? (u as any).reminder_count + 1 : 1,
        }).eq("id", u.id);
        results.waitlist++;
      } else {
        results.errors++;
      }
    }

    // FLOW 2: Invite acceptance reminder — invited, invite_sent_at > 48h ago, no signup yet
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: invitedUsers } = await sb
      .from("waitlist_signups")
      .select("id, name, email, invite_token, invite_sent_at, last_reminder_sent_at, status")
      .eq("invited", true)
      .not("invite_token", "is", null)
      .lt("invite_sent_at", fortyEightHoursAgo)
      .neq("status", "reviewed");

    for (const u of (invitedUsers || [])) {
      if (u.last_reminder_sent_at && new Date(u.last_reminder_sent_at) > new Date(fiveDaysAgo)) continue;

      const inviteLink = `https://insighthalo.com/invite?token=${u.invite_token}`;
      const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
      const ok = await sendEmail(conn, u.email, "Your InsightHalo access is waiting",
        buildInviteReminderHtml(u.name, inviteLink), smtpUser, smtpPass);
      conn.close();

      if (ok) {
        await sb.from("waitlist_signups").update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: (u as any).reminder_count ? (u as any).reminder_count + 1 : 1,
        }).eq("id", u.id);
        results.invite++;
      } else {
        results.errors++;
      }
    }

    // FLOW 3: New user activation reminder — users with 0 activity 48h after signup
    // We check user_captures, user_projects, user_memory_entries for any activity
    const { data: { users: authUsers } } = await sb.auth.admin.listUsers() as any;
    
    for (const authUser of (authUsers || [])) {
      const createdAt = new Date(authUser.created_at);
      if (createdAt > new Date(fortyEightHoursAgo)) continue; // Too new
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (createdAt < sevenDaysAgo) continue; // Too old, skip

      // Check for any activity
      const { count: captureCount } = await sb.from("user_captures").select("id", { count: "exact", head: true }).eq("user_id", authUser.id);
      if ((captureCount || 0) > 0) continue;

      const { count: projectCount } = await sb.from("user_projects").select("id", { count: "exact", head: true }).eq("user_id", authUser.id);
      if ((projectCount || 0) > 0) continue;

      const { count: memoryCount } = await sb.from("user_memory_entries").select("id", { count: "exact", head: true }).eq("user_id", authUser.id);
      if ((memoryCount || 0) > 0) continue;

      // Check if we already sent a reminder (use waitlist entry if exists)
      const { data: wl } = await sb.from("waitlist_signups").select("id, last_reminder_sent_at, reminder_count").eq("email", authUser.email).maybeSingle();
      if (wl?.last_reminder_sent_at && new Date(wl.last_reminder_sent_at) > new Date(fiveDaysAgo)) continue;

      const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
      const ok = await sendEmail(conn, authUser.email, "Start building your second brain",
        buildActivationReminderHtml(authUser.user_metadata?.name || ""), smtpUser, smtpPass);
      conn.close();

      if (ok) {
        if (wl) {
          await sb.from("waitlist_signups").update({
            last_reminder_sent_at: now.toISOString(),
            reminder_count: (wl.reminder_count || 0) + 1,
          }).eq("id", wl.id);
        }
        results.activation++;
      } else {
        results.errors++;
      }
    }

    console.log("Follow-up reminders completed:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Follow-up reminders failed:", err);
    return new Response(JSON.stringify({ error: "Failed to process reminders" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
