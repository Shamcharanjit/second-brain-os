/**
 * Hook that tracks first_login, second_session_returned, day2_retained, day7_retained
 * automatically when a user is authenticated.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { logFunnelEvent } from "@/lib/activation-funnel";

const SESSION_KEY = "insighthalo_session_count";
const FIRST_LOGIN_KEY = "insighthalo_first_login_at";

/** Get user-scoped key to prevent cross-account contamination */
function userKey(base: string, userId: string) {
  return `${base}_${userId}`;
}

export function useActivationFunnelTracker() {
  const { user, cloudAvailable } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (!user || !cloudAvailable || tracked.current) return;
    tracked.current = true;

    const userId = user.id;

    // Track first_login
    logFunnelEvent("first_login", { userId, source: "auth_session" });

    // Track session count for second_session_returned (user-scoped)
    const now = Date.now();
    const firstLoginKey = userKey(FIRST_LOGIN_KEY, userId);
    const sessionKey = userKey(SESSION_KEY, userId);

    const firstLoginAt = localStorage.getItem(firstLoginKey);
    if (!firstLoginAt) {
      localStorage.setItem(firstLoginKey, String(now));
    }

    const sessionCount = parseInt(localStorage.getItem(sessionKey) || "0", 10) + 1;
    localStorage.setItem(sessionKey, String(sessionCount));

    if (sessionCount >= 2) {
      logFunnelEvent("second_session_returned", { userId, source: "session_tracker" });
    }

    // Check day2 and day7 retention
    const firstLogin = parseInt(firstLoginAt || String(now), 10);
    const daysSinceFirst = (now - firstLogin) / (1000 * 60 * 60 * 24);

    if (daysSinceFirst >= 2) {
      logFunnelEvent("day2_retained", { userId, source: "retention_tracker" });
    }
    if (daysSinceFirst >= 7) {
      logFunnelEvent("day7_retained", { userId, source: "retention_tracker" });
    }
  }, [user, cloudAvailable]);
}
