/**
 * Visitor attribution tracking.
 * Captures referrer + landing page on first visit, stores anonymous_id locally,
 * and links to a user on signup/login.
 */
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "ih_anon_id";
const ATTRIBUTED_KEY = "ih_attributed_v1";

function getAnonId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function classifySource(referrer: string, utmSource?: string | null): string {
  const ref = (referrer || "").toLowerCase();
  const utm = (utmSource || "").toLowerCase();
  const blob = `${ref} ${utm}`;
  if (/google\./.test(ref) || utm === "google") return "google";
  if (/bing\./.test(ref) || utm === "bing") return "bing";
  if (/duckduckgo\./.test(ref) || utm === "duckduckgo") return "duckduckgo";
  if (/yahoo\./.test(ref)) return "yahoo";
  if (/yandex\./.test(ref)) return "yandex";
  if (/baidu\./.test(ref)) return "baidu";
  if (/ecosia\./.test(ref)) return "ecosia";
  if (/brave\./.test(ref)) return "brave";
  if (/(facebook|twitter|x\.com|linkedin|instagram|t\.co|reddit|youtube|tiktok|pinterest)\./.test(blob)) return "social";
  if (!ref) return "direct";
  return "unknown";
}

/**
 * Capture first-visit attribution. Idempotent — only writes once per browser.
 */
export async function captureAttributionOnce(): Promise<void> {
  try {
    if (localStorage.getItem(ATTRIBUTED_KEY)) return;
    const url = new URL(window.location.href);
    const utm_source = url.searchParams.get("utm_source");
    const utm_medium = url.searchParams.get("utm_medium");
    const utm_campaign = url.searchParams.get("utm_campaign");
    const referrer = document.referrer || "";
    const source = classifySource(referrer, utm_source);
    const anonymous_id = getAnonId();
    const landing_page = url.pathname;

    // Best-effort country (non-blocking)
    let country: string | null = null;
    try {
      const r = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const j = await r.json();
        country = j?.country_name ?? null;
      }
    } catch { /* ignore */ }

    await supabase.from("visitor_attribution" as any).insert({
      anonymous_id,
      source,
      referrer_url: referrer || null,
      landing_page,
      utm_source,
      utm_medium,
      utm_campaign,
      country,
    });
    localStorage.setItem(ATTRIBUTED_KEY, "1");
  } catch {
    /* silent */
  }
}

/**
 * Link the anonymous visit row to the current authenticated user.
 * Marks converted_at; activated_at is set later via linkActivation().
 */
export async function linkAttributionToUser(userId: string, email: string | null | undefined): Promise<void> {
  try {
    const anonymous_id = localStorage.getItem(ANON_KEY);
    if (!anonymous_id) return;
    await supabase
      .from("visitor_attribution" as any)
      .update({ user_id: userId, email: email ?? null, converted_at: new Date().toISOString() })
      .eq("anonymous_id", anonymous_id)
      .is("user_id", null);
  } catch { /* silent */ }
}

/**
 * Mark the attribution row as activated.
 */
export async function markAttributionActivated(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("visitor_attribution" as any)
      .update({ activated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("activated_at", null)
      .select("id");
    if (data && data.length > 0) {
      try {
        const { trackEvent } = await import("@/lib/analytics/ga4");
        trackEvent("activation_complete", { user_id: userId });
      } catch { /* silent */ }
    }
  } catch { /* silent */ }
}
