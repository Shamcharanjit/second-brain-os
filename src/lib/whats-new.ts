/**
 * What's New — feature update data layer.
 * Reads from public.announcements (type='feature_update') and tracks per-user
 * "seen" state via public.user_seen_announcements.
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
};

export async function fetchFeatureUpdates(): Promise<FeatureUpdate[]> {
  try {
    const { data, error } = await supabase
      .from("announcements" as never)
      .select("id, title, message, version_tag, created_at, cta_label, cta_link, type, status, visible_from, visible_to")
      .eq("status", "active")
      .eq("type", "feature_update")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[whats-new] fetch error", error.message);
      return [];
    }
    const now = Date.now();
    return ((data ?? []) as any[])
      .filter((a) => {
        const from = a.visible_from ? new Date(a.visible_from).getTime() : null;
        const to = a.visible_to ? new Date(a.visible_to).getTime() : null;
        if (from && now < from) return false;
        if (to && now > to) return false;
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
      }));
  } catch {
    return [];
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
