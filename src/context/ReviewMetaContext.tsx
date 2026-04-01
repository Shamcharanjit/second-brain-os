import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { saveState, loadState } from "@/lib/persistence";

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

  useEffect(() => { saveState(STORAGE_KEY, meta); }, [meta]);

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
