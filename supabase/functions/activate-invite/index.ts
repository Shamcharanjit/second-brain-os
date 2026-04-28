import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 16) {
      return Response.json(
        { success: false, error: "Invalid invite token" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return Response.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Validate invite token
    const { data: waitlistRow, error: lookupError } = await supabase
      .from("waitlist_signups")
      .select("email, invited, status")
      .eq("invite_token", token.trim())
      .maybeSingle();

    if (lookupError || !waitlistRow || !waitlistRow.invited) {
      return Response.json(
        { success: false, error: "Invalid or expired invite link" },
        { status: 400, headers: corsHeaders }
      );
    }

    const email = waitlistRow.email;

    // 2. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User already created their account — just tell them to sign in
      return Response.json(
        { success: false, error: "Account already exists. Please sign in instead." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Create user with confirmed email (skip verification since they proved ownership via invite email)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      console.error("Failed to create user:", createError);
      return Response.json(
        { success: false, error: createError?.message || "Failed to create account" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 4. Guarantee waitlist_signups row exists and is updated
    const now = new Date().toISOString();
    const nameFallback = email.split("@")[0] || "User";

    // Try update by email (case-insensitive) first
    const { data: updatedRows, error: updateErr } = await supabase
      .from("waitlist_signups")
      .update({
        status: "activated",
        invited: true,
        invite_accepted_at: now,
        activation_completed_at: now,
        last_email_type_sent: "invite",
      })
      .ilike("email", email)
      .select("id");

    const rowUpdated = !updateErr && updatedRows && updatedRows.length > 0;

    if (!rowUpdated) {
      // No existing row — create one so metadata is never missing
      const { error: insertErr } = await supabase
        .from("waitlist_signups")
        .insert({
          email: email.toLowerCase(),
          name: nameFallback,
          status: "activated",
          invited: true,
          invite_token: token.trim(),
          invite_sent_at: now,
          invite_accepted_at: now,
          activation_completed_at: now,
          last_email_type_sent: "invite",
        });

      if (insertErr) {
        console.error("Failed to create waitlist_signups row:", insertErr);
      }
    } else {
      // Also update invite_sent_at if it was null
      await supabase
        .from("waitlist_signups")
        .update({ invite_sent_at: now })
        .ilike("email", email)
        .is("invite_sent_at", null);
    }

    // 5. Send welcome email (fire-and-forget — never block activation on email failure)
    try {
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPass = Deno.env.get("SMTP_PASS");
      const firstName = (email.split("@")[0] || "there").replace(/[._-]+/g, " ").split(" ")[0];
      const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      if (smtpUser && smtpPass) {
        const SMTP_HOST = "smtp.hostinger.com";
        const SMTP_PORT = 465;
        const SENDER_EMAIL = "earlyaccess@insighthalo.com";
        const SENDER_NAME = "InsightHalo";

        const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to InsightHalo</title></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
        <tr><td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:32px 32px 0 32px;">
          <span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span>
        </td></tr>
        <tr><td align="center" style="padding:28px 32px 0 32px;">
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">Welcome aboard, ${displayName}! 🎉</h1>
        </td></tr>
        <tr><td align="center" style="padding:20px 32px 0 32px;">
          <div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div>
        </td></tr>
        <tr><td style="padding:24px 32px 0 32px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Your InsightHalo account is ready. Here's how to get started in the next 2 minutes:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #1f2937;">
              <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;"><span style="color:#10b981;font-weight:700;">1.</span> <strong style="color:#f9fafb;">Capture your first idea</strong> — type anything into the box on your dashboard. A task, a thought, a goal.</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #1f2937;">
              <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;"><span style="color:#10b981;font-weight:700;">2.</span> <strong style="color:#f9fafb;">Let AI organise it</strong> — InsightHalo tags, routes, and surfaces your captures automatically.</p>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;"><span style="color:#10b981;font-weight:700;">3.</span> <strong style="color:#f9fafb;">Do a daily review</strong> — 2 minutes each morning to stay on top of everything.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:32px 32px 0 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background-color:#10b981;border-radius:8px;">
              <a href="https://insighthalo.com/app" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open InsightHalo →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:36px 32px 32px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #1f2937;padding-top:24px;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">&mdash; Shamcharan, InsightHalo</p>
              <p style="margin:0;font-size:13px;color:#6b7280;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const textBody = `Welcome to InsightHalo, ${displayName}!

Your account is ready. Here's how to get started:

1. Capture your first idea — type anything into the dashboard. A task, thought, or goal.
2. Let AI organise it — InsightHalo tags and routes your captures automatically.
3. Do a daily review — 2 minutes each morning to stay on top of everything.

Open InsightHalo: https://insighthalo.com/app

— Shamcharan, InsightHalo
support@insighthalo.com`;

        const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
        const mimeMessage = [
          `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
          `To: ${email}`,
          `Subject: Welcome to InsightHalo — you're in! 🎉`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=UTF-8`,
          ``,
          textBody,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          htmlBody,
          `--${boundary}--`,
        ].join("\r\n");

        const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const read = async () => { const b = new Uint8Array(4096); const n = await conn.read(b); return n ? dec.decode(b.subarray(0, n)) : ""; };
        const send = async (cmd: string) => { await conn.write(enc.encode(cmd + "\r\n")); return read(); };
        await read();
        await send(`EHLO insighthalo.com`);
        await send(`AUTH LOGIN`);
        await send(btoa(smtpUser));
        const ar = await send(btoa(smtpPass));
        if (ar.startsWith("235")) {
          await send(`MAIL FROM:<${SENDER_EMAIL}>`);
          await send(`RCPT TO:<${email}>`);
          await send(`DATA`);
          await send(mimeMessage + "\r\n.");
          await send(`QUIT`);
        }
        conn.close();
        console.log(`Welcome email sent to ${email}`);
      }
    } catch (emailErr) {
      // Never block activation on email failure
      console.error("Welcome email failed (non-fatal):", emailErr);
    }

    // 6. Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData?.session) {
      // Account was created but auto-sign-in failed — user can sign in manually
      return Response.json(
        { success: true, session: null, message: "Account created! Please sign in." },
        { status: 200, headers: corsHeaders }
      );
    }

    return Response.json(
      { success: true, session: signInData.session },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("activate-invite error:", err);
    return Response.json(
      { success: false, error: "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
