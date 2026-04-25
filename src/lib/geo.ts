/**
 * Geo capture — detect a user's country/region/city via IP geolocation
 * (https://ipapi.co/json) and merge it into auth.users.raw_user_meta_data
 * without overwriting existing keys.
 *
 * Falls back to an email TLD heuristic when IP lookup fails or returns
 * no country, so the User Geography panel always has something to show.
 *
 * Runs at most once per browser session per user (sessionStorage flag).
 */

import { supabase } from "@/lib/supabase/client";

type GeoMeta = {
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
};

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
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch("https://ipapi.co/json/", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const out: GeoMeta = {};
    if (data.country_name) out.country = String(data.country_name);
    if (data.country_code) out.country_code = String(data.country_code).toUpperCase();
    if (data.region) out.region = String(data.region);
    if (data.city) out.city = String(data.city);
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * Ensure the current user has country metadata. Safe to call repeatedly —
 * skips work if already captured this session or if metadata already has a country.
 */
export async function captureGeoMetadata(opts: { force?: boolean } = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const flagKey = `ih_geo_captured:${user.id}`;
    if (!opts.force && sessionStorage.getItem(flagKey) === "1") return;

    const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
    const hasCountry =
      typeof existing.country === "string" && (existing.country as string).length > 0;

    // Already have country — mark done and exit unless forcing
    if (hasCountry && !opts.force) {
      sessionStorage.setItem(flagKey, "1");
      return;
    }

    let geo = await fetchIpGeo();
    if (!geo || !geo.country) {
      const fallback = inferFromEmail(user.email);
      if (fallback) geo = { ...(geo ?? {}), ...fallback };
    }
    if (!geo || Object.keys(geo).length === 0) {
      sessionStorage.setItem(flagKey, "1");
      return;
    }

    // Merge — never overwrite existing keys
    const merged: Record<string, unknown> = { ...existing };
    for (const [k, v] of Object.entries(geo)) {
      if (merged[k] === undefined || merged[k] === null || merged[k] === "") {
        merged[k] = v;
      }
    }

    const { error } = await supabase.auth.updateUser({ data: merged });
    if (!error) sessionStorage.setItem(flagKey, "1");
  } catch {
    // never throw from auth side-effects
  }
}
