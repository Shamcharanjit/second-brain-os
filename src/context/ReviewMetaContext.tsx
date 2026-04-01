import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { saveState, loadState } from "@/lib/persistence";
import { fetchReviewMeta, upsertReviewMeta } from "@/lib/supabase/data-layer";
import { useAuth } from "@/context/AuthContext";

interface ReviewMeta {
  last_daily_review_at: string | null;
  last_weekly_review_at: string | null;
}

interface ReviewMetaContextType extends ReviewMeta {
  markDailyComplete: () => void;
  markWeeklyComplete: () => void;
}

const STORAGE_KEY = "insighthalo_review";
const DEFAULTS: ReviewMeta = { last_daily_review_at: null, last_weekly_review_at: null };

const ReviewMetaContext = createContext<ReviewMetaContextType | null>(null);

export function ReviewMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<ReviewMeta>(() => loadState(STORAGE_KEY, DEFAULTS));
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
        setMeta(cloud);
        saveState(STORAGE_KEY, cloud); // overwrite local to stay in sync
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
    setMeta((prev) => ({ ...prev, last_daily_review_at: new Date().toISOString() }));
  }, []);

  const markWeeklyComplete = useCallback(() => {
    setMeta((prev) => ({ ...prev, last_weekly_review_at: new Date().toISOString() }));
  }, []);

  return (
    <ReviewMetaContext.Provider value={{ ...meta, markDailyComplete, markWeeklyComplete }}>
      {children}
    </ReviewMetaContext.Provider>
  );
}

export function useReviewMeta() {
  const ctx = useContext(ReviewMetaContext);
  if (!ctx) throw new Error("useReviewMeta must be used within ReviewMetaProvider");
  return ctx;
}
