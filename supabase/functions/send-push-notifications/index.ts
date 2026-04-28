/**
 * send-push-notifications
 *
 * Sends a "Time for your daily review" Web Push notification to all users who:
 *   1. Have a push subscription saved
 *   2. Have NOT completed their daily review today
 *   3. Have at least 3 captures (new users don't need a review nudge yet)
 *
 * Called daily at 14:05 UTC via GitHub Actions cron.
 * Uses VAPID auth (private key stored as VAPID_PRIVATE_KEY Supabase secret).
 *
 * VAPID public key:
 *   BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = "BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM";
const VAPID_SUBJECT     = "mailto:support@insighthalo.com";

// ─── Utility: base64url encode ─────��──────────────────────────────────────────

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── VAPID JWT signing (Web Crypto, works in Deno) ───────────────────────────

async function buildVapidHeaders(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
): Promise<{ Authorization: string; "Crypto-Key": string }> {
  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header  = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })));
  const toSign  = `${header}.${payload}`;

  // Import private key (PKCS8 raw from web-push format = raw EC private key, 32 bytes)
  const rawPrivKey = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

  // web-push private key is raw 32-byte EC private key — wrap in PKCS8
  const pkcs8 = buildPKCS8(rawPrivKey);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(toSign),
  );

  const jwt = `${toSign}.${base64UrlEncode(sigBuffer)}`;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKeyBase64}`,
    "Crypto-Key": `p256ecdsa=${publicKeyBase64}`,
  };
}

// Wrap a raw 32-byte EC P-256 private key in PKCS8 DER structure
function buildPKCS8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 wrapper for EC P-256 private key (OID 1.2.840.10045.3.1.7)
  const ecOid = new Uint8Array([0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]);
  const ecKey = new Uint8Array([0x30, 0x27, 0x02, 0x01, 0x01, 0x04, 0x20, ...rawKey, 0xa0, 0x00]);
  const inner = new Uint8Array([0x04, ecKey.length + ecOid.length, ...ecOid, ...ecKey]);
  const outer = new Uint8Array([0x30, inner.length, ...inner]);
  return outer.buffer;
}

// ─── Send a single push message via the Web Push Protocol ────────────────────

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPrivateKey: string,
): Promise<{ ok: boolean; status?: number }> {
  try {
    const vapidHeaders = await buildVapidHeaders(endpoint, vapidPrivateKey, VAPID_PUBLIC_KEY);

    // Encrypt payload using Web Push encryption (RFC 8291 / aes128gcm)
    // For simplicity we send without content encryption — supported by modern browsers
    // (payload will be delivered as plaintext push; notification body set in SW)
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...vapidHeaders,
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payload,
    });

    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error("Push send error:", err);
    return { ok: false };
  }
}

// ─── Main handler ────────────────────────────────────────────────���────────────

Deno.serve(async (req) => {
  // Allow GET (cron) or POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPriv   = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPriv) {
    return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get today's date in UTC (for review completion check)
  const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Find users who have a push subscription AND haven't done today's review
  // We join push_subscriptions → review_meta (or captures as proxy)
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (subErr) {
    return new Response(JSON.stringify({ error: subErr.message }), { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 });
  }

  // For each subscription holder, check:
  //   1. They have ≥3 captures
  //   2. They haven't marked a daily review done today
  const userIds = [...new Set(subs.map((s: any) => s.user_id))];

  // Captures counts
  const { data: captureCounts } = await admin.rpc("get_capture_counts_for_users" as never, { user_ids: userIds }).catch(() => ({ data: null }));

  // Daily review completions today (activation_funnel_events with event_type = 'daily_review_complete' and date)
  const { data: reviewedToday } = await admin
    .from("activation_funnel_events")
    .select("user_id")
    .eq("event_type", "daily_review_complete")
    .gte("created_at", `${todayUtc}T00:00:00Z`)
    .lte("created_at", `${todayUtc}T23:59:59Z`);

  const reviewedSet = new Set((reviewedToday ?? []).map((r: any) => r.user_id));
  const captureMap  = new Map((captureCounts ?? []).map((c: any) => [c.user_id, c.count]));

  let sent = 0;
  let skipped = 0;

  const payload = JSON.stringify({
    title: "InsightHalo — Daily Review",
    body:  "2 minutes to clear your inbox and set tomorrow's focus. Tap to start.",
    url:   "/review",
    tag:   "daily-review",
  });

  for (const sub of (subs as any[])) {
    const { user_id, endpoint, p256dh, auth } = sub;

    // Skip if review done today
    if (reviewedSet.has(user_id)) { skipped++; continue; }

    // Skip if < 3 captures (brand new user)
    const count = captureMap.get(user_id) ?? 0;
    if (count < 3) { skipped++; continue; }

    const result = await sendWebPush(endpoint, p256dh, auth, payload, vapidPriv);

    if (result.ok) {
      sent++;
    } else if (result.status === 404 || result.status === 410) {
      // Subscription expired — clean up
      await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
      skipped++;
    } else {
      skipped++;
    }
  }

  console.log(`Push notifications: sent=${sent}, skipped=${skipped}`);
  return new Response(JSON.stringify({ sent, skipped }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
