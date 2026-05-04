/**
 * useNotificationPreferences
 *
 * Read/write user notification preferences from
 * public.user_notification_preferences (one row per user).
 *
 * Falls back to sensible defaults if no row exists yet.
 * Upserts on save.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface NotificationPrefs {
  morning_brief:    boolean;
  inbox_overflow:   boolean;
  streak_alert:     boolean;
  daily_review:     boolean;
  due_today:        boolean;
  morning_hour:     number;   // 0-23
  evening_hour:     number;   // 0-23
  inbox_threshold:  number;
  timezone:         string;
}

const DEFAULTS: NotificationPrefs = {
  morning_brief:   true,
  inbox_overflow:  true,
  streak_alert:    true,
  daily_review:    true,
  due_today:       true,
  morning_hour:    7,
  evening_hour:    20,
  inbox_threshold: 5,
  timezone:        Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
};

export function useNotificationPreferences() {
  const { user, cloudAvailable } = useAuth();
  const [prefs, setPrefs]     = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Load on mount
  useEffect(() => {
    if (!user || !cloudAvailable) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          setPrefs({
            morning_brief:   data.morning_brief   ?? DEFAULTS.morning_brief,
            inbox_overflow:  data.inbox_overflow  ?? DEFAULTS.inbox_overflow,
            streak_alert:    data.streak_alert    ?? DEFAULTS.streak_alert,
            daily_review:    data.daily_review    ?? DEFAULTS.daily_review,
            due_today:       data.due_today       ?? DEFAULTS.due_today,
            morning_hour:    data.morning_hour    ?? DEFAULTS.morning_hour,
            evening_hour:    data.evening_hour    ?? DEFAULTS.evening_hour,
            inbox_threshold: data.inbox_threshold ?? DEFAULTS.inbox_threshold,
            timezone:        data.timezone        ?? DEFAULTS.timezone,
          });
        }
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, cloudAvailable]);

  // Save (upsert)
  const savePrefs = useCallback(async (updates: Partial<NotificationPrefs>) => {
    if (!user) return false;
    setSaving(true);
    const merged = { ...prefs, ...updates };

    const { error } = await (supabase as any)
      .from("user_notification_preferences")
      .upsert(
        { user_id: user.id, ...merged, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (!error) setPrefs(merged);
    setSaving(false);
    return !error;
  }, [user, prefs]);

  return { prefs, loading, saving, savePrefs };
}
