/**
 * ReviewReminderBanner
 *
 * Shows a gentle daily review nudge after 2pm (14:00) local time
 * if the user hasn't completed a daily review today.
 *
 * Dismissed state is persisted in localStorage per calendar date,
 * so it reappears the next day automatically.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RotateCcw, X } from "lucide-react";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { useBrain } from "@/context/BrainContext";
import { format } from "date-fns";

const DISMISS_KEY = "review_reminder_dismissed_";

function getTodayKey() {
  return DISMISS_KEY + format(new Date(), "yyyy-MM-dd");
}

function wasDismissedToday() {
  try {
    return localStorage.getItem(getTodayKey()) === "1";
  } catch {
    return false;
  }
}

function dismissToday() {
  try {
    localStorage.setItem(getTodayKey(), "1");
  } catch {}
}

export default function ReviewReminderBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dailyDoneToday } = useReviewMeta();
  const { captures } = useBrain();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show after 2pm local time
    const hour = new Date().getHours();
    if (hour < 14) return;

    // Don't show on the review page itself
    if (location.pathname === "/review") return;

    // Only show if user has some captures (at least 3) — brand new users
    // don't need a review reminder yet
    if (captures.length < 3) return;

    // Don't show if already done today
    if (dailyDoneToday) return;

    // Don't show if dismissed today
    if (wasDismissedToday()) return;

    setVisible(true);
  }, [location.pathname, captures.length, dailyDoneToday]);

  if (!visible) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 md:px-8">
      <div className="rounded-xl border border-[hsl(var(--brain-teal))]/30 bg-[hsl(var(--brain-teal))]/5 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="h-4 w-4 text-[hsl(var(--brain-teal))] shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Time for your daily review</p>
            <p className="text-[11px] text-muted-foreground">2 minutes to clear your inbox and set tomorrow's focus.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { navigate("/review"); setVisible(false); }}
            className="text-xs font-medium text-[hsl(var(--brain-teal))] hover:underline px-2 py-1"
          >
            Start review →
          </button>
          <button
            onClick={() => { dismissToday(); setVisible(false); }}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
