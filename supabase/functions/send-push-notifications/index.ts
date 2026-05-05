/**
 * send-push-notifications  v2
 *
 * Multi-type smart notification engine.
 *
 * Query param:  ?type=morning | review | evening | all
 *   morning  → morning_brief + due_today           (run ~7:05 UTC or user tz offset)
 *   review   → daily_review                        (run ~14:05 UTC — existing cron)
 *   evening  → streak_alert + inbox_overflow        (run ~20:05 UTC)
 *   all      → every type (useful for manual triggers / testing)
 *
 * User preferences come from public.user_notification_preferences.
 * In-app notifications inserted to public.in_app_notifications for:
 *   morning_brief, inbox_overflow, streak_alert
 *
 * VAPID public key:
 *   BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM";
const VAPID_SUBJECT    = "mailto:support@insighthalo.com";

// ─── base64url ────────────────────────────────────────────────────────────────

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── VAPID JWT ────────────────────────────────────────────────────────────────

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

  const rawPrivKey = Uint8Array.from(
    atob(privateKeyBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
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

function buildPKCS8(rawKey: Uint8Array): ArrayBuffer {
  const ecOid = new Uint8Array([0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07]);
  const ecKey  = new Uint8Array([0x30,0x27,0x02,0x01,0x01,0x04,0x20,...rawKey,0xa0,0x00]);
  const inner  = new Uint8Array([0x04, ecKey.length + ecOid.length, ...ecOid, ...ecKey]);
  const outer  = new Uint8Array([0x30, inner.length, ...inner]);
  return outer.buffer;
}

// ─── Web Push send ────────────────────────────────────────────────────────────

async function sendWebPush(
  endpoint: string,
  _p256dh: string,
  _auth: string,
  payload: string,
  vapidPrivateKey: string,
): Promise<{ ok: boolean; status?: number }> {
  try {
    const vapidHeaders = await buildVapidHeaders(endpoint, vapidPrivateKey, VAPID_PUBLIC_KEY);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { ...vapidHeaders, "Content-Type": "application/json", TTL: "86400" },
      body: payload,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error("Push send error:", err);
    return { ok: false };
  }
}

// ─── In-app notification insert ───────────────────────────────────────────────

async function insertInApp(
  admin: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  await admin.from("in_app_notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url       = new URL(req.url);
  const mode      = (url.searchParams.get("type") ?? "review") as "morning" | "review" | "evening" | "all";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPriv   = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPriv) {
    return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // ── Load all push subscriptions ──────────────────────────────────────────────
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (subErr) {
    return new Response(JSON.stringify({ error: subErr.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0, mode }), { status: 200 });
  }

  const userIds = [...new Set((subs as any[]).map((s) => s.user_id))];

  // ── Load user notification preferences ───────────────────────────────────────
  const { data: prefsRows } = await admin
    .from("user_notification_preferences")
    .select("*")
    .in("user_id", userIds);

  const prefsMap = new Map<string, any>();
  for (const p of (prefsRows ?? [])) prefsMap.set(p.user_id, p);

  // Helper: get pref for a user (falls back to defaults if no row yet)
  function prefs(userId: string) {
    return prefsMap.get(userId) ?? {
      morning_brief: true,
      inbox_overflow: true,
      streak_alert: true,
      daily_review: true,
      due_today: true,
      inbox_threshold: 5,
    };
  }

  // ── Load data needed for each notification type ───────────────────────────────

  // 1. Daily review completions today
  const { data: reviewedToday } = await admin
    .from("activation_funnel_events")
    .select("user_id")
    .eq("event_type", "daily_review_complete")
    .gte("created_at", `${todayUtc}T00:00:00Z`)
    .lte("created_at", `${todayUtc}T23:59:59Z`);
  const reviewedSet = new Set((reviewedToday ?? []).map((r: any) => r.user_id));

  // 2. Inbox counts (unprocessed captures)
  const { data: inboxRows } = await admin
    .from("user_captures")
    .select("user_id")
    .eq("status", "inbox")
    .in("user_id", userIds);
  const inboxCount = new Map<string, number>();
  for (const r of (inboxRows ?? [])) {
    inboxCount.set(r.user_id, (inboxCount.get(r.user_id) ?? 0) + 1);
  }

  // 3. Tasks pinned to today
  const { data: todayTasks } = await admin
    .from("user_captures")
    .select("user_id")
    .eq("is_pinned_today", true)
    .eq("status", "active")
    .in("user_id", userIds);
  const todayTaskCount = new Map<string, number>();
  for (const r of (todayTasks ?? [])) {
    todayTaskCount.set(r.user_id, (todayTaskCount.get(r.user_id) ?? 0) + 1);
  }

  // 3b. Captures with due_date = today (from ai_data JSONB field)
  const todayDate = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const { data: dueTodayRows } = await admin
    .from("user_captures")
    .select("user_id, title, ai_data")
    .eq("status", "active")
    .eq("is_completed", false)
    .in("user_id", userIds);

  // Group captures due today per user (ai_data.due_date matches today)
  const dueTodayMap = new Map<string, string[]>(); // user_id → [title, ...]
  for (const r of (dueTodayRows ?? [])) {
    const dueDate = (r.ai_data as any)?.due_date;
    if (dueDate === todayDate) {
      const list = dueTodayMap.get(r.user_id) ?? [];
      list.push(r.title ?? "Untitled");
      dueTodayMap.set(r.user_id, list);
    }
  }

  // 4. Streak: last capture timestamp per user
  const { data: lastCaptures } = await admin
    .from("user_captures")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  const lastCaptureAt = new Map<string, string>();
  for (const r of (lastCaptures ?? [])) {
    if (!lastCaptureAt.has(r.user_id)) lastCaptureAt.set(r.user_id, r.created_at);
  }

  // 5. Total capture counts (for new-user filtering)
  const captureTotalMap = new Map<string, number>();
  const { data: capTotals } = await admin
    .from("user_captures")
    .select("user_id")
    .in("user_id", userIds);
  for (const r of (capTotals ?? [])) {
    captureTotalMap.set(r.user_id, (captureTotalMap.get(r.user_id) ?? 0) + 1);
  }

  // ── Process each subscription ─────────────────────────────────────────────────

  let sent = 0;
  let skipped = 0;

  const nowMs = Date.now();
  const h24Ms = 24 * 60 * 60 * 1000;

  for (const sub of (subs as any[])) {
    const { user_id, endpoint, p256dh, auth } = sub;
    const p = prefs(user_id);
    const totalCaptures = captureTotalMap.get(user_id) ?? 0;

    // Skip brand-new users with < 3 captures (no value yet)
    if (totalCaptures < 3) { skipped++; continue; }

    const notifications: { payload: object; inApp?: { type: string; title: string; body: string; link?: string } }[] = [];

    // ── MORNING mode ─────────────────────────────────────────────────────────
    if (mode === "morning" || mode === "all") {

      // morning_brief
      if (p.morning_brief) {
        const inbox  = inboxCount.get(user_id) ?? 0;
        const tasks  = todayTaskCount.get(user_id) ?? 0;
        const body   = [
          tasks  > 0 ? `${tasks} task${tasks > 1 ? "s" : ""} for today` : null,
          inbox  > 0 ? `${inbox} item${inbox > 1 ? "s" : ""} in inbox`  : null,
        ].filter(Boolean).join(" · ") || "Your second brain is ready. Let's have a great day.";

        notifications.push({
          payload: { title: "Good morning ☀️", body, url: "/today", tag: "morning-brief" },
          inApp:  { type: "reminder", title: "Good morning ☀️", body, link: "/today" },
        });
      }

      // due_today — named alerts for captures with due_date = today
      if (p.due_today) {
        const dueTitles = dueTodayMap.get(user_id) ?? [];
        if (dueTitles.length === 1) {
          // Single item — mention it by name
          notifications.push({
            payload: {
              title: `Due today: ${dueTitles[0]}`,
              body:  "Tap to open Today and get it done.",
              url:   "/today",
              tag:   "due-today",
            },
          });
        } else if (dueTitles.length > 1) {
          notifications.push({
            payload: {
              title: `${dueTitles.length} items due today`,
              body:  dueTitles.slice(0, 2).join(", ") + (dueTitles.length > 2 ? ` + ${dueTitles.length - 2} more` : ""),
              url:   "/today",
              tag:   "due-today",
            },
          });
        } else {
          // Fallback to pinned-today count
          const tasks = todayTaskCount.get(user_id) ?? 0;
          if (tasks > 0) {
            notifications.push({
              payload: {
                title: `${tasks} task${tasks > 1 ? "s" : ""} on your Today list`,
                body:  "Tap to open Today and start your first focus session.",
                url:   "/today",
                tag:   "due-today",
              },
            });
          }
        }
      }
    }

    // ── REVIEW mode ───────────────────────────────────────────────────────────
    if (mode === "review" || mode === "all") {
      if (p.daily_review && !reviewedSet.has(user_id)) {
        notifications.push({
          payload: {
            title: "InsightHalo — Daily Review",
            body:  "2 minutes to clear your inbox and set tomorrow's focus. Tap to start.",
            url:   "/review",
            tag:   "daily-review",
          },
        });
      }
    }

    // ── EVENING mode ──────────────────────────────────────────────────────────
    if (mode === "evening" || mode === "all") {

      // streak_alert: no capture in last 24 h
      if (p.streak_alert) {
        const last = lastCaptureAt.get(user_id);
        const msSinceLast = last ? nowMs - new Date(last).getTime() : Infinity;
        if (msSinceLast > h24Ms) {
          notifications.push({
            payload: {
              title: "Don't break your streak 🔥",
              body:  "You haven't captured anything today. Add a quick thought to keep your streak alive.",
              url:   "/",
              tag:   "streak-alert",
            },
            inApp: {
              type:  "streak",
              title: "Streak at risk 🔥",
              body:  "You haven't captured anything today.",
              link:  "/",
            },
          });
        }
      }

      // inbox_overflow: inbox > threshold
      if (p.inbox_overflow) {
        const inbox     = inboxCount.get(user_id) ?? 0;
        const threshold = p.inbox_threshold ?? 5;
        if (inbox >= threshold) {
          notifications.push({
            payload: {
              title: `Inbox overflow: ${inbox} items waiting`,
              body:  "Review and triage your captures to keep your second brain organised.",
              url:   "/inbox",
              tag:   "inbox-overflow",
            },
            inApp: {
              type:  "inbox",
              title: `${inbox} items in your inbox`,
              body:  "Triage your captures to keep your second brain current.",
              link:  "/inbox",
            },
          });
        }
      }
    }

    // ── Send all queued notifications for this user ───────────────────────────
    for (const n of notifications) {
      // Insert in-app first (fire-and-forget)
      if (n.inApp) {
        await insertInApp(admin, user_id, n.inApp.type, n.inApp.title, n.inApp.body, n.inApp.link);
      }

      // Send push
      const result = await sendWebPush(endpoint, p256dh, auth, JSON.stringify(n.payload), vapidPriv);

      if (result.ok) {
        sent++;
      } else if (result.status === 404 || result.status === 410) {
        // Expired subscription — remove it
        await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
        skipped++;
        break; // no point sending more to this dead endpoint
      } else {
        skipped++;
      }
    }

    if (notifications.length === 0) skipped++;
  }

  console.log(`[send-push-notifications] mode=${mode} sent=${sent} skipped=${skipped}`);
  return new Response(JSON.stringify({ sent, skipped, mode }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
