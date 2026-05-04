/**
 * useInAppNotifications
 *
 * Fetches unread in-app notifications from public.in_app_notifications.
 * Provides helpers to mark individual or all notifications as read.
 *
 * Polls every 60 s for new notifications.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface InAppNotification {
  id:         string;
  type:       string;
  title:      string;
  body:       string | null;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useInAppNotifications() {
  const { user, cloudAvailable } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading]             = useState(true);
  const intervalRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user || !cloudAvailable) { setLoading(false); return; }

    const { data, error } = await (supabase as any)
      .from("in_app_notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      setNotifications(data as InAppNotification[]);
    }
    setLoading(false);
  }, [user, cloudAvailable]);

  // Initial load + polling
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark a single notification as read
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await (supabase as any)
      .from("in_app_notifications")
      .update({ is_read: true })
      .eq("id", id);
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await (supabase as any)
      .from("in_app_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
