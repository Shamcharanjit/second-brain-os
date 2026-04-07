const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME = "InsightHalo";

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

    const subject = "You're on the InsightHalo early access list";

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:520px;">
        <tr><td style="font-size:22px;font-weight:bold;color:#111;padding-bottom:24px;">
          Welcome to InsightHalo
        </td></tr>
        <tr><td style="font-size:15px;color:#333;line-height:1.6;padding-bottom:16px;">
          Hi ${escapeHtml(name)},
        </td></tr>
        <tr><td style="font-size:15px;color:#333;line-height:1.6;padding-bottom:16px;">
          You're now on the early-access waitlist.
        </td></tr>
        <tr><td style="font-size:15px;color:#333;line-height:1.6;padding-bottom:16px;">
          We're gradually inviting users in small groups to ensure a smooth rollout and high-quality experience.
        </td></tr>
        <tr><td style="font-size:15px;color:#333;line-height:1.6;padding-bottom:32px;">
          You'll receive your private access link as soon as your invite is ready.
        </td></tr>
        <tr><td style="font-size:14px;color:#666;line-height:1.5;">
          — Team InsightHalo
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textBody = `Welcome to InsightHalo

Hi ${name},

You're now on the early-access waitlist.

We're gradually inviting users in small groups to ensure a smooth rollout and high-quality experience.

You'll receive your private access link as soon as your invite is ready.

— Team InsightHalo`;

    // Build MIME message
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

    // Send via SMTP using Deno TCP + TLS
    const conn = await Deno.connectTls({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
    });

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

    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO insighthalo.com`);

    // AUTH LOGIN
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    const authResp = await sendCommand(btoa(smtpPass));
    if (!authResp.startsWith("235")) {
      conn.close();
      throw new Error(`SMTP auth failed: ${authResp}`);
    }

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${SENDER_EMAIL}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${email}>`);

    // DATA
    await sendCommand(`DATA`);
    const dataResp = await sendCommand(mimeMessage + "\r\n.");
    if (!dataResp.startsWith("250")) {
      conn.close();
      throw new Error(`SMTP send failed: ${dataResp}`);
    }

    // QUIT
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
