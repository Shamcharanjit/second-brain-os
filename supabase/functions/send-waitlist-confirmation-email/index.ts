const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME = "InsightHalo";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlBody(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the InsightHalo early access waitlist</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111827;border-radius:16px;overflow:hidden;">
          <!-- Header accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Logo area -->
          <tr>
            <td align="center" style="padding:32px 32px 0 32px;">
              <span style="font-size:22px;font-weight:700;color:#f9fafb;letter-spacing:-0.02em;">InsightHalo</span>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td align="center" style="padding:28px 32px 0 32px;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">You're on the list</h1>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td align="center" style="padding:20px 32px 0 32px;">
              <div style="width:48px;height:2px;background-color:#10b981;border-radius:1px;"></div>
            </td>
          </tr>
          <!-- Body copy -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">Thanks for joining the InsightHalo early access waitlist.</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#d1d5db;">InsightHalo helps you capture ideas instantly, organize thoughts intelligently, and review what matters automatically &mdash; without friction.</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">We're inviting users gradually to ensure a smooth experience for everyone.</p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:32px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#10b981;border-radius:8px;">
                    <a href="https://insighthalo.com" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Visit InsightHalo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:36px 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #1f2937;padding-top:24px;">
                    <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">&mdash; Team InsightHalo</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;"><a href="mailto:support@insighthalo.com" style="color:#6b7280;text-decoration:underline;">support@insighthalo.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTextBody(name: string): string {
  return `Hi ${name},

Thanks for joining the InsightHalo early access waitlist.

InsightHalo helps you capture ideas instantly, organize thoughts intelligently, and review what matters automatically — without friction.

We're inviting users gradually to ensure a smooth experience for everyone.

Visit InsightHalo: https://insighthalo.com

— Team InsightHalo
support@insighthalo.com`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "email and name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpUser || !smtpPass) {
      console.error("SMTP credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = "You're on the InsightHalo early access waitlist";
    const htmlBody = buildHtmlBody(name);
    const textBody = buildTextBody(name);

    const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
    const mimeMessage = [
      `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      textBody,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
      `--${boundary}--`,
    ].join("\r\n");

    const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buf.subarray(0, n));
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    }

    await readResponse();
    await sendCommand(`EHLO insighthalo.com`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    const authResp = await sendCommand(btoa(smtpPass));
    if (!authResp.startsWith("235")) {
      conn.close();
      throw new Error(`SMTP auth failed: ${authResp}`);
    }

    await sendCommand(`MAIL FROM:<${SENDER_EMAIL}>`);
    await sendCommand(`RCPT TO:<${email}>`);
    await sendCommand(`DATA`);
    const dataResp = await sendCommand(mimeMessage + "\r\n.");
    if (!dataResp.startsWith("250")) {
      conn.close();
      throw new Error(`SMTP send failed: ${dataResp}`);
    }

    await sendCommand(`QUIT`);
    conn.close();

    console.log(`Waitlist confirmation email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Failed to send waitlist confirmation email:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
