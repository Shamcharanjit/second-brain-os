/**
 * useReminderActivator
 * ────────────────────
 * Polls the local reminder store and, when a reminder is due, materializes
 * it as a Today capture (pinned), then marks it activated. Also logs a
 * `day2_retained` funnel event so Growth Intelligence can track real Day-2
 * return behavior — not just intent.
 *
 * Runs once on mount and then on a 60s interval. Cheap because the store
 * lives in localStorage.
 */
import { useEffect, useRef } from "react";
import { useBrain } from "@/context/BrainContext";
import { useAuth } from "@/context/AuthContext";
import { getDueReminders, markReminderActivated } from "@/lib/reminders";
import { logFunnelEvent } from "@/lib/activation-funnel";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 60_000;

export function useReminderActivator() {
  const { addCaptureFromAction, togglePinToday } = useBrain();
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    function activateDueReminders() {
      const due = getDueReminders();
      if (due.length === 0) return;

      for (const reminder of due) {
        try {
          const text = reminder.source_title
            ? `Reminder: ${reminder.source_title}`
            : `Reminder: ${reminder.source_text}`;

          const capture = addCaptureFromAction({ text });
          // Pin it so it shows up at the top of Today
          togglePinToday(capture.id);
          markReminderActivated(reminder.id, capture.id);

          if (user?.id) {
            logFunnelEvent("day2_retained", {
              userId: user.id,
              source: "reminder_fired",
              metadata: {
                reminder_id: reminder.id,
                timing: reminder.timing,
                due_at: reminder.due_at,
              },
            });
          }

          toast("InsightHalo brought back a reminder", {
            description: reminder.source_title || reminder.source_text,
          });
        } catch (err) {
          console.error("[useReminderActivator] failed to activate reminder:", err);
        }
      }
    }

    // Run once immediately on mount
    if (!ranRef.current) {
      ranRef.current = true;
      activateDueReminders();
    }

    const interval = setInterval(activateDueReminders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [addCaptureFromAction, togglePinToday, user]);
}
