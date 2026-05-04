/**
 * send-weekly-summary
 *
 * Every Sunday at 19:00 UTC, generates a personalised weekly recap for each
 * active user and delivers it via:
 *   1. In-app notification (public.in_app_notifications)
 *   2. Web Push (if subscribed)
 *
 * The recap covers the past 7 days:
 *   - Total captures, by category breakdown
 *   - Tasks completed vs created
 *   - Streak info
 *   - AI-generated one-liner insight (via Gemini)
 *
 * Called by GitHub Actions cron: "0 19 * * 0"  (Sunday 19:00 UTC)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM";

// ─── SMTP Email ───────────────────────────────────────────────────────────────

const SMTP_HOST    = "smtp.hostinger.com";
const SMTP_PORT    = 465;
const SENDER_EMAIL = "earlyaccess@insighthalo.com";
const SENDER_NAME  = "InsightHalo";

function buildWeeklyHtml(params: {
  firstName: string;
  total: number;
  completed: number;
  topCategory: string;
  streak: number;
  insight: string;
}): string {
  const { firstName, total, completed, topCategory, streak, insight } = params;
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
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Your weekly brain recap</p>
        </td></tr>
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">Hey ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#d1d5db;font-style:italic;">"${insight}"</p>
        </td></tr>

        <!-- Stats row -->
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" align="center" style="padding:16px 8px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#10b981;">${total}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Captures</p>
              </td>
              <td width="2%"></td>
              <td width="33%" align="center" style="padding:16px 8px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#10b981;">${completed}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Done</p>
              </td>
              <td width="2%"></td>
              <td width="30%" align="center" style="padding:16px 8px;background-color:#0f172a;border-radius:10px;border:1px solid #1f2937;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#10b981;">${streak}d</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Streak</p>
              </td>
            </tr>
          </table>
          <p style="margin:12px 0 0;text-align:center;font-size:12px;color:#6b7280;">Top category this week: <strong style="color:#d1d5db;">${topCategory}</strong></p>
        </td></tr>

        <tr><td align="center" style="padding:0 32px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#10b981;border-radius:8px;">
              <a href="https://insighthalo.com/analytics" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">View my analytics →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <div style="border-top:1px solid #1f2937;padding-top:20px;">
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

function buildWeeklyText(params: {
  firstName: string; total: number; completed: number;
  topCategory: string; streak: number; insight: string;
}): string {
  const { firstName, total, completed, topCategory, streak, insight } = params;
  return `Hey ${firstName},

"${insight}"

YOUR WEEK IN REVIEW
• ${total} captures this week
• ${completed} tasks completed
• ${streak}-day streak
• Top category: ${topCategory}

View your full analytics: https://insighthalo.com/analytics

— Shamcharan, InsightHalo
support@insighthalo.com`;
}

async function sendWeeklySummaryEmail(
  email: string,
  firstName: string,
  stats: { total: number; completed: number; topCategory: string; streak: number; insight: string },
): Promise<boolean> {
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  if (!smtpUser || !smtpPass) return false;

  try {
    const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const read = async () => {
      const b = new Uint8Array(8192);
      const n = await conn.read(b);
      return n ? dec.decode(b.subarray(0, n)) : "";
    };
    const send = async (cmd: string) => { await conn.write(enc.encode(cmd + "\r\n")); return read(); };

    const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
    const subject = `Your week: ${stats.total} captures, ${stats.streak}-day streak`;
    const mime = [
      `From: "${SENDER_NAME}" <${SENDER_EMAIL}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      buildWeeklyText({ firstName, ...stats }),
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      buildWeeklyHtml({ firstName, ...stats }),
      `--${boundary}--`,
    ].join("\r\n");

    await read(); // greeting
    await send(`EHLO insighthalo.com`);
    await send(`AUTH LOGIN`);
    await send(btoa(smtpUser));
    const authResp = await send(btoa(smtpPass));
    if (!authResp.startsWith("235")) { conn.close(); return false; }

    await send(`MAIL FROM:<${SENDER_EMAIL}>`);
    await send(`RCPT TO:<${email}>`);
    await send(`DATA`);
    const dataResp = await send(mime + "\r\n.");
    await send(`QUIT`);
    conn.close();

    return dataResp.startsWith("250");
  } catch (err) {
    console.error(`[weekly-email] failed for ${email}:`, err);
    return false;
  }
}
const VAPID_SUBJECT    = "mailto:support@insighthalo.com";

// ─── base64url + VAPID (reused pattern) ──────────────────────────────────────

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function buildVapidHeaders(endpoint: string, privKey: string, pubKey: string) {
  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header  = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })));
  const toSign  = `${header}.${payload}`;
  const raw = Uint8Array.from(atob(privKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const ecOid = new Uint8Array([0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07]);
  const ecKey  = new Uint8Array([0x30,0x27,0x02,0x01,0x01,0x04,0x20,...raw,0xa0,0x00]);
  const inner  = new Uint8Array([0x04, ecKey.length + ecOid.length, ...ecOid, ...ecKey]);
  const pkcs8  = new Uint8Array([0x30, inner.length, ...inner]).buffer;
  const cryptoKey = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${base64UrlEncode(sig)}`;
  return { Authorization: `vapid t=${jwt}, k=${pubKey}`, "Crypto-Key": `p256ecdsa=${pubKey}` };
}

async function sendWebPush(endpoint: string, p256dh: string, auth: string, payload: string, vapidPriv: string) {
  try {
    const headers = await buildVapidHeaders(endpoint, vapidPriv, VAPID_PUBLIC_KEY);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", TTL: "86400" },
      body: payload,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

// ─── AI one-liner insight ─────────────────────────────────────────────────────

async function generateInsight(stats: {
  total: number;
  completed: number;
  topCategory: string;
  streakDays: number;
}): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return `You captured ${stats.total} thoughts this week. Keep building the habit!`;

  const isLovable = apiKey.startsWith("lv_") || apiKey.startsWith("sk-lovable");
  const endpoint = isLovable
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const model = isLovable ? "google/gemini-2.5-flash" : "gemini-flash-latest";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        messages: [{
          role: "user",
          content: `Write a single motivational sentence (max 15 words) for someone's weekly brain recap. Stats: ${stats.total} captures, ${stats.completed} tasks done, top category: ${stats.topCategory}, ${stats.streakDays} day streak. Be specific and encouraging. No emojis.`,
        }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? `${stats.total} captures this week. Your second brain is growing.`;
  } catch {
    return `${stats.total} captures this week. Your second brain is growing.`;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPriv   = Deno.env.get("VAPID_PRIVATE_KEY");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all users with at least 1 capture in the past week
  const { data: weekCaptures } = await admin
    .from("user_captures")
    .select("user_id, status, is_completed, ai_data")
    .gte("created_at", sevenDaysAgo);

  if (!weekCaptures || weekCaptures.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No active users this week" }), { status: 200 });
  }

  // Group by user
  const userMap = new Map<string, any[]>();
  for (const c of weekCaptures) {
    if (!userMap.has(c.user_id)) userMap.set(c.user_id, []);
    userMap.get(c.user_id)!.push(c);
  }

  // Get push subscriptions
  const userIds = [...userMap.keys()];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subMap = new Map<string, any>();
  for (const s of (subs ?? [])) subMap.set(s.user_id, s);

  // Get streak data (last capture per user across all time)
  const { data: allCaptures } = await admin
    .from("user_captures")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  const streakMap = new Map<string, number>();
  if (allCaptures) {
    const byUser = new Map<string, string[]>();
    for (const c of allCaptures) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
      byUser.get(c.user_id)!.push(c.created_at);
    }
    for (const [uid, dates] of byUser) {
      let streak = 0;
      let d = new Date(); d.setHours(0,0,0,0);
      for (let i = 0; i < 30; i++) {
        const dayStr = d.toISOString().slice(0, 10);
        if (dates.some((dt) => dt.startsWith(dayStr))) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      streakMap.set(uid, streak);
    }
  }

  // Get user emails for SMTP delivery
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  const profileMap = new Map<string, { email: string; full_name: string }>();
  for (const p of (profiles ?? [])) profileMap.set(p.id, p);

  let sent = 0;
  let skipped = 0;
  let emailsSent = 0;

  for (const [userId, caps] of userMap) {
    if (caps.length < 3) { skipped++; continue; } // skip very new users

    const total     = caps.length;
    const completed = caps.filter((c) => c.is_completed).length;
    const streak    = streakMap.get(userId) ?? 0;

    // Top category
    const catCount = new Map<string, number>();
    for (const c of caps) {
      const cat = c.ai_data?.category ?? "task";
      catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
    }
    const topCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "task";

    // Generate AI insight
    const insight = await generateInsight({ total, completed, topCategory, streakDays: streak });

    const title = `Your week in review — ${total} captures`;
    const body  = `${completed} tasks done · ${topCategory} was your top category · ${streak} day streak. ${insight}`;

    // Insert in-app notification
    await admin.from("in_app_notifications").insert({
      user_id: userId,
      type:    "reminder",
      title,
      body,
      link:    "/analytics",
    });

    // Send push if subscribed
    const sub = subMap.get(userId);
    if (sub && vapidPriv) {
      const result = await sendWebPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        JSON.stringify({ title, body, url: "/analytics", tag: "weekly-summary" }),
        vapidPriv,
      );
      if (result.ok) sent++;
      else if (result.status === 404 || result.status === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        skipped++;
      } else skipped++;
    } else {
      skipped++;
    }

    // Send SMTP email
    const profile = profileMap.get(userId);
    if (profile?.email) {
      const rawName = profile.full_name || profile.email.split("@")[0] || "there";
      const firstName = rawName.replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
      const capitalised = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      const ok = await sendWeeklySummaryEmail(profile.email, capitalised, {
        total, completed, topCategory, streak, insight,
      });
      if (ok) emailsSent++;
    }
  }

  console.log(`[send-weekly-summary] push_sent=${sent} skipped=${skipped} emails=${emailsSent}`);
  return new Response(JSON.stringify({ sent, skipped, emailsSent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
