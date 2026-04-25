/**
 * Geo capture — detect a user's country/region/city via IP geolocation
 * (https://ipapi.co/json) and merge it into auth.users.raw_user_meta_data
 * without overwriting existing keys.
 *
 * Falls back to an email TLD heuristic when IP lookup fails or returns
 * no country, so the User Geography panel always has something to show.
 *
 * Re-runs each session UNTIL country is confirmed saved in user_metadata.
 */

import { supabase } from "@/lib/supabase/client";

type GeoMeta = {
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
};

const isDev = typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
const log = (...args: unknown[]) => { if (isDev) console.log("[geo]", ...args); };

const TLD_MAP: Record<string, { country: string; country_code: string }> = {
  in: { country: "India", country_code: "IN" },
  uk: { country: "United Kingdom", country_code: "GB" },
  ca: { country: "Canada", country_code: "CA" },
  au: { country: "Australia", country_code: "AU" },
  de: { country: "Germany", country_code: "DE" },
  fr: { country: "France", country_code: "FR" },
  sg: { country: "Singapore", country_code: "SG" },
  ae: { country: "UAE", country_code: "AE" },
  nl: { country: "Netherlands", country_code: "NL" },
};

function inferFromEmail(email?: string | null): GeoMeta | null {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  for (const [tld, info] of Object.entries(TLD_MAP)) {
    if (lower.endsWith(`.${tld}`)) return { ...info };
  }
  return null;
}

async function fetchIpGeo(): Promise<GeoMeta | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://ipapi.co/json/", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!res.ok) { log("ipapi http", res.status); return null; }
    const data = await res.json();
    if (!data || data.error) { log("ipapi error", data?.reason); return null; }
    const out: GeoMeta = {};
    if (data.country_name) out.country = String(data.country_name);
    if (data.country_code) out.country_code = String(data.country_code).toUpperCase();
    if (data.region) out.region = String(data.region);
    if (data.city) out.city = String(data.city);
    log("ipapi resolved", out);
    return Object.keys(out).length ? out : null;
  } catch (err) {
    log("ipapi failed", err);
    return null;
  }
}

/**
 * Ensure the current user has country metadata. Safe to call repeatedly.
 * Will retry on every session until country is confirmed in user_metadata.
 */
export async function captureGeoMetadata(opts: { force?: boolean } = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { log("no user"); return; }

    const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
    const hasCountry =
      typeof existing.country === "string" && (existing.country as string).length > 0;

    // Confirmed saved already — skip
    if (hasCountry && !opts.force) {
      log("already has country:", existing.country);
      return;
    }

    let geo = await fetchIpGeo();
    if (!geo || !geo.country) {
      const fallback = inferFromEmail(user.email);
      if (fallback) {
        log("using email TLD fallback", fallback);
        geo = { ...(geo ?? {}), ...fallback };
      }
    }
    if (!geo || Object.keys(geo).length === 0) {
      log("no geo resolved — will retry next session");
      return;
    }

    // Merge — never overwrite existing keys
    const merged: Record<string, unknown> = { ...existing };
    for (const [k, v] of Object.entries(geo)) {
      if (merged[k] === undefined || merged[k] === null || merged[k] === "") {
        merged[k] = v;
      }
    }

    const { data, error } = await supabase.auth.updateUser({ data: merged });
    if (error) {
      log("updateUser failed", error.message);
    } else {
      log("metadata saved", data?.user?.user_metadata);
    }
  } catch (err) {
    log("captureGeoMetadata threw", err);
  }
}
