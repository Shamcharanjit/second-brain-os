/**
 * What's New — feature update data layer.
 *
 * Primary source: public.announcements (type='feature_update') in Supabase.
 * Populated automatically on every push to main via the sync-changelog
 * GitHub Action → sync-changelog edge function → changelog.json.
 *
 * Fallback: /changelog.json (public static file) — used when Supabase is
 * unreachable or the table is empty (e.g. first deploy, local dev).
 */

import { supabase } from "@/lib/supabase/client";

export type FeatureUpdate = {
  id: string;
  title: string;
  message: string;
  version_tag: string | null;
  created_at: string;
  cta_label: string | null;
  cta_link: string | null;
  audience: "user" | "admin" | "internal";
};

/**
 * Fetch feature updates with audience filtering.
 * - Subscribers (default): only `audience = 'user'`
 * - Admins/founders: all audiences
 */
/** Load the bundled /changelog.json as a guaranteed fallback. */
async function fetchLocalChangelog(): Promise<FeatureUpdate[]> {
  try {
    const res = await fetch("/changelog.json");
    if (!res.ok) return [];
    const raw: Array<{
      id: string; title: string; message: string;
      version_tag?: string | null; cta_label?: string | null;
      cta_link?: string | null; date: string; audience?: string;
    }> = await res.json();
    return raw.map((e) => ({
      id: e.id,
      title: e.title,
      message: e.message,
      version_tag: e.version_tag ?? null,
      created_at: e.date ? `${e.date}T00:00:00Z` : new Date().toISOString(),
      cta_label: e.cta_label ?? null,
      cta_link: e.cta_link ?? null,
      audience: (e.audience ?? "user") as "user" | "admin" | "internal",
    }));
  } catch {
    return [];
  }
}

export async function fetchFeatureUpdates(opts?: { isAdmin?: boolean }): Promise<FeatureUpdate[]> {
  const isAdmin = !!opts?.isAdmin;

  try {
    const { data, error } = await supabase
      .from("announcements" as never)
      .select("id, title, message, version_tag, created_at, cta_label, cta_link, type, status, visible_from, visible_to, audience")
      .eq("status", "active")
      .eq("type", "feature_update")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[whats-new] fetch error — falling back to changelog.json", error.message);
      return fetchLocalChangelog();
    }

    const now = Date.now();
    const remoteUpdates = ((data ?? []) as any[])
      .filter((a) => {
        const from = a.visible_from ? new Date(a.visible_from).getTime() : null;
        const to = a.visible_to ? new Date(a.visible_to).getTime() : null;
        if (from && now < from) return false;
        if (to && now > to) return false;
        const audience = (a.audience ?? "user") as "user" | "admin" | "internal";
        if (!isAdmin && audience !== "user") return false;
        return true;
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        version_tag: a.version_tag ?? null,
        created_at: a.created_at,
        cta_label: a.cta_label ?? null,
        cta_link: a.cta_link ?? null,
        audience: (a.audience ?? "user") as "user" | "admin" | "internal",
      }));

    // If Supabase has entries, use them. Otherwise fall back to local JSON.
    if (remoteUpdates.length > 0) return remoteUpdates;
    return fetchLocalChangelog();
  } catch {
    return fetchLocalChangelog();
  }
}

export async function fetchSeenIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("user_seen_announcements" as never)
      .select("announcement_id")
      .eq("user_id", userId);
    if (error) return new Set();
    return new Set(((data ?? []) as any[]).map((r) => r.announcement_id));
  } catch {
    return new Set();
  }
}

export async function markAnnouncementSeen(userId: string, announcementId: string): Promise<void> {
  try {
    await supabase
      .from("user_seen_announcements" as never)
      .upsert(
        { user_id: userId, announcement_id: announcementId },
        { onConflict: "user_id,announcement_id" } as never
      );
  } catch (err) {
    console.warn("[whats-new] mark seen failed", err);
  }
}

export function formatUpdateDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
