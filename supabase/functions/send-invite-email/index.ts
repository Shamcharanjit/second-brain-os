import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME = "InsightHalo";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildInviteHtml(name: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;">You've been invited to InsightHalo early access!</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
<tr><td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 32px 0 32px;"><span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span></td></tr>
<tr><td align="center" style="padding:28px 32px 0 32px;"><h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">You're invited!</h1></td></tr>
<tr><td align="center" style="padding:20px 32px 0 32px;"><div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div></td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Great news &mdash; you've been selected for InsightHalo early access! Click below to set your password and start building your second brain.</p>
<p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">Your invite link is personal and can only be used once.</p>
</td></tr>
<tr><td align="center" style="padding:32px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#10b981;border-radius:8px;">
<a href="${inviteLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Activate Your Account</a>
</td></tr></table></td></tr>
<tr><td style="padding:16px 32px 0 32px;"><p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">Or copy this link: <a href="${inviteLink}" style="color:#10b981;text-decoration:underline;word-break:break-all;">${inviteLink}</a></p></td></tr>
<tr><td style="padding:36px 32px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #1f2937;padding-top:24px;">
<p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">&mdash; Team InsightHalo</p>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
}

function buildApprovalHtml(name: string, activationLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;">You're in — your InsightHalo early access is approved!</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
<tr><td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 32px 0 32px;"><span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span></td></tr>
<tr><td align="center" style="padding:28px 32px 0 32px;"><h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">You're in!</h1></td></tr>
<tr><td align="center" style="padding:20px 32px 0 32px;"><div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div></td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Great news &mdash; your early access to InsightHalo is now approved.</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">You can now activate your account and start building your second brain.</p>
<p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">Your invite gives you early access before public release. We're excited to have you inside.</p>
</td></tr>
<tr><td align="center" style="padding:32px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#10b981;border-radius:8px;">
<a href="${activationLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Activate Your Account</a>
</td></tr></table></td></tr>
<tr><td style="padding:16px 32px 0 32px;"><p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">Or copy this link: <a href="${activationLink}" style="color:#10b981;text-decoration:underline;word-break:break-all;">${activationLink}</a></p></td></tr>
<tr><td style="padding:36px 32px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #1f2937;padding-top:24px;">
<p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">&mdash; InsightHalo Team</p>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendViaSMTP(to: string, subject: string, html: string, smtpUser: string, smtpPass: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });

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
    conn.close();
    return true;
  } catch (err) {
    console.error(`Failed to send to ${to}:`, err);
    try { conn.close(); } catch {}
    return false;
  }
}

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
    const body = await req.json();

    // Support modes:
    // Single invite:   { waitlist_id: string }
    // Batch invite:    { batch_size: number }
    // Resend:          { waitlist_id: string, resend: true }
    // Approval:        { waitlist_id: string, approval: true }
    // Batch approval:  { batch_size: number, approval: true }

    const isApproval = body.approval === true;
    const results = { sent: 0, failed: 0, ids: [] as string[] };

    let targets: { id: string; name: string; email: string; invite_token: string | null; invited: boolean; status: string; last_email_type_sent: string | null; email_send_count: number }[] = [];

    if (body.batch_size && typeof body.batch_size === "number") {
      if (isApproval) {
        // Batch approval: select invited users who haven't received approval email yet
        const { data } = await sb
          .from("waitlist_signups")
          .select("id, name, email, invite_token, invited, status, last_email_type_sent, email_send_count")
          .eq("invited", true)
          .not("invite_token", "is", null)
          .neq("last_email_type_sent", "approval")
          .order("created_at", { ascending: true })
          .limit(Math.min(body.batch_size, 20));

        targets = data || [];
      } else {
        // Batch invite: select top N uninvited pending users by priority
        const { data } = await sb
          .from("waitlist_signups")
          .select("id, name, email, invite_token, invited, status, last_email_type_sent, email_send_count, referral_reward_level, referral_count, created_at")
          .eq("status", "pending")
          .eq("invited", false)
          .order("referral_reward_level", { ascending: false })
          .order("referral_count", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(Math.min(body.batch_size, 20));

        targets = (data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          invite_token: d.invite_token,
          invited: d.invited,
          status: d.status,
          last_email_type_sent: d.last_email_type_sent,
          email_send_count: d.email_send_count ?? 0,
        }));
      }
    } else if (body.waitlist_id) {
      const { data } = await sb
        .from("waitlist_signups")
        .select("id, name, email, invite_token, invited, status, last_email_type_sent, email_send_count")
        .eq("id", body.waitlist_id)
        .single();

      if (data) targets = [{ ...data, email_send_count: data.email_send_count ?? 0 }];
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ error: "No eligible users found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const user of targets) {
      // Generate token if needed
      let token = user.invite_token;
      if (!token) {
        const arr = new Uint8Array(24);
        crypto.getRandomValues(arr);
        token = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
      }

      let subject: string;
      let html: string;
      let emailType: string;

      if (isApproval && user.invited && token && user.last_email_type_sent !== "approval") {
        // Approval email
        const activationLink = `https://insighthalo.com/invite?token=${token}`;
        subject = "You're in — welcome to InsightHalo Early Access";
        html = buildApprovalHtml(user.name, activationLink);
        emailType = "approval";
      } else if (!isApproval) {
        // Standard invite or resend
        const inviteLink = `https://insighthalo.com/invite?token=${token}`;
        const isResend = body.resend === true;
        subject = isResend
          ? "Reminder: Your InsightHalo invite is waiting"
          : "You're invited to InsightHalo early access!";
        html = buildInviteHtml(user.name, inviteLink);
        emailType = isResend ? "invite_resend" : "invite";
      } else {
        // Approval requested but user doesn't qualify — skip
        continue;
      }

      const ok = await sendViaSMTP(user.email, subject, html, smtpUser, smtpPass);

      if (ok) {
        const now = new Date().toISOString();
        await sb
          .from("waitlist_signups")
          .update({
            invited: true,
            status: emailType === "approval" ? "approved" : "invited",
            invite_token: token,
            invite_sent_at: now,
            last_email_type_sent: emailType,
            email_send_count: user.email_send_count + 1,
          })
          .eq("id", user.id);

        // Log funnel event
        try {
          const funnelType = emailType === "approval" ? "approval_email_sent" : "waitlist_email_sent";
          await sb.from("activation_funnel_events").insert({
            waitlist_signup_email: user.email,
            event_type: funnelType,
            event_source: "send-invite-email",
          });
        } catch (funnelErr) { console.error("Funnel log error:", funnelErr); }

        results.sent++;
        results.ids.push(user.id);
      } else {
        results.failed++;
      }
    }

    console.log("Email results:", results);
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send invite error:", err);
    return new Response(JSON.stringify({ error: "Failed to send invites" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
