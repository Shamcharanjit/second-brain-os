import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { saveState, loadState } from "@/lib/persistence";
import { fetchReviewMeta, upsertReviewMeta } from "@/lib/supabase/data-layer";
import { useAuth } from "@/context/AuthContext";
import { isToday, differenceInCalendarDays, formatDistanceToNow } from "date-fns";

interface ReviewMeta {
  last_daily_review_at: string | null;
  last_weekly_review_at: string | null;
  daily_review_dates: string[]; // ISO date strings (YYYY-MM-DD) for streak tracking
}

interface ReviewMetaContextType extends Omit<ReviewMeta, "daily_review_dates"> {
  markDailyComplete: () => void;
  markWeeklyComplete: () => void;
  dailyDoneToday: boolean;
  weeklyOverdue: boolean;
  dailyStreak: number;
  lastWeeklyLabel: string;
  monthTotal: number;
}

const STORAGE_KEY = "insighthalo_review";
const DEFAULTS: ReviewMeta = { last_daily_review_at: null, last_weekly_review_at: null, daily_review_dates: [] };

const ReviewMetaContext = createContext<ReviewMetaContextType | null>(null);

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = todayDateStr();
  // Must include today or yesterday to have a streak
  if (sorted[0] !== today && differenceInCalendarDays(new Date(today), new Date(sorted[0])) > 1) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (differenceInCalendarDays(new Date(sorted[i - 1]), new Date(sorted[i])) === 1) {
      streak++;
    } else break;
  }
  return streak;
}

export function ReviewMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<ReviewMeta>(() => {
    const loaded = loadState<ReviewMeta>(STORAGE_KEY, DEFAULTS);
    // Migration: add daily_review_dates if missing from old persisted data
    if (!loaded.daily_review_dates) return { ...loaded, daily_review_dates: [] };
    return loaded;
  });
  const { user } = useAuth();

  // Local persistence
  useEffect(() => { saveState(STORAGE_KEY, meta); }, [meta]);

  // Cloud hydration (once on auth)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cloud = await fetchReviewMeta(user.id);
      if (cloud && !cancelled) {
        const merged = { ...cloud, daily_review_dates: meta.daily_review_dates };
        setMeta(merged);
        saveState(STORAGE_KEY, merged);
      } else if (!cloud && (meta.last_daily_review_at || meta.last_weekly_review_at)) {
        await upsertReviewMeta(user.id, meta);
      }
    })();
    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cloud save on change
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      upsertReviewMeta(user.id, meta);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [meta, user]);

  const markDailyComplete = useCallback(() => {
    const now = new Date().toISOString();
    const dateStr = todayDateStr();
    setMeta((prev) => ({
      ...prev,
      last_daily_review_at: now,
      daily_review_dates: prev.daily_review_dates.includes(dateStr)
        ? prev.daily_review_dates
        : [...prev.daily_review_dates, dateStr],
    }));
  }, []);

  const markWeeklyComplete = useCallback(() => {
    setMeta((prev) => ({ ...prev, last_weekly_review_at: new Date().toISOString() }));
  }, []);

  const derived = useMemo(() => {
    const dailyDoneToday = !!(meta.last_daily_review_at && isToday(new Date(meta.last_daily_review_at)));
    const weeklyOverdue = !meta.last_weekly_review_at || differenceInCalendarDays(new Date(), new Date(meta.last_weekly_review_at)) >= 7;
    const dailyStreak = computeStreak(meta.daily_review_dates);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthTotal = meta.daily_review_dates.filter((d) => d >= monthStart).length;

    const lastWeeklyLabel = meta.last_weekly_review_at
      ? formatDistanceToNow(new Date(meta.last_weekly_review_at), { addSuffix: true })
      : "Never";

    return { dailyDoneToday, weeklyOverdue, dailyStreak, monthTotal, lastWeeklyLabel };
  }, [meta]);

  return (
    <ReviewMetaContext.Provider value={{
      last_daily_review_at: meta.last_daily_review_at,
      last_weekly_review_at: meta.last_weekly_review_at,
      markDailyComplete, markWeeklyComplete,
      ...derived,
    }}>
      {children}
    </ReviewMetaContext.Provider>
  );
}

export function useReviewMeta() {
  const ctx = useContext(ReviewMetaContext);
  if (!ctx) throw new Error("useReviewMeta must be used within ReviewMetaProvider");
  return ctx;
}
