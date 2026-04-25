/**
 * Day-2 Retention Reminder Store
 * ──────────────────────────────
 * Lightweight, local-first reminder system. Stores follow-up reminders in
 * localStorage (user-scoped via persistence helper) and exposes helpers to
 * schedule, list, and mark them activated when due.
 *
 * Reminders are intentionally NOT pushed to Supabase — they are device-local
 * scheduling hints. When a reminder fires we create a real Today capture
 * (which DOES sync) and log a `day2_retained` activation funnel event so
 * Growth Intelligence can track Day-2 return behavior.
 */
import { saveState, loadState } from "@/lib/persistence";

const STORAGE_KEY = "insighthalo_reminders";

export type ReminderTiming =
  | "tomorrow_morning"
  | "tonight"
  | "next_week"
  | "custom";

export interface FollowUpReminder {
  id: string;
  /** The capture this reminder was created from */
  source_capture_id: string;
  /** Snapshot of the original capture text so we can re-surface it */
  source_text: string;
  /** Snapshot of the AI title (for nicer Today card) */
  source_title: string | null;
  /** ISO timestamp when this reminder should fire */
  due_at: string;
  /** ISO timestamp when the reminder was created */
  created_at: string;
  /** Which preset the user picked */
  timing: ReminderTiming;
  /** Set when the reminder has been activated (Today capture created) */
  activated_at: string | null;
  /** Capture id of the Today reminder we created (for dedupe) */
  activated_capture_id: string | null;
}

// ── Storage ────────────────────────────────────────────────────────────────

export function loadReminders(): FollowUpReminder[] {
  return loadState<FollowUpReminder[]>(STORAGE_KEY, []);
}

export function saveReminders(reminders: FollowUpReminder[]): void {
  saveState(STORAGE_KEY, reminders);
}

// ── Timing presets ─────────────────────────────────────────────────────────

/** Compute the ISO due_at for a given timing preset. */
export function computeDueAt(timing: ReminderTiming, customISO?: string): string {
  const now = new Date();
  switch (timing) {
    case "tomorrow_morning": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    case "tonight": {
      const d = new Date(now);
      // If it's already past 7pm, push to tomorrow morning instead
      if (d.getHours() >= 19) {
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
      } else {
        d.setHours(20, 0, 0, 0);
      }
      return d.toISOString();
    }
    case "next_week": {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    case "custom": {
      if (customISO) return customISO;
      // Fallback: tomorrow morning
      return computeDueAt("tomorrow_morning");
    }
  }
}

export function timingLabel(timing: ReminderTiming): string {
  switch (timing) {
    case "tomorrow_morning": return "Tomorrow morning";
    case "tonight": return "Tonight";
    case "next_week": return "Next week";
    case "custom": return "Custom time";
  }
}

// ── Mutators ───────────────────────────────────────────────────────────────

export function scheduleReminder(input: {
  source_capture_id: string;
  source_text: string;
  source_title: string | null;
  timing: ReminderTiming;
  customISO?: string;
}): FollowUpReminder {
  const reminder: FollowUpReminder = {
    id: `reminder-${crypto.randomUUID()}`,
    source_capture_id: input.source_capture_id,
    source_text: input.source_text,
    source_title: input.source_title,
    due_at: computeDueAt(input.timing, input.customISO),
    created_at: new Date().toISOString(),
    timing: input.timing,
    activated_at: null,
    activated_capture_id: null,
  };

  const all = loadReminders();
  all.push(reminder);
  saveReminders(all);
  return reminder;
}

export function markReminderActivated(id: string, todayCaptureId: string): void {
  const all = loadReminders();
  const updated = all.map((r) =>
    r.id === id
      ? { ...r, activated_at: new Date().toISOString(), activated_capture_id: todayCaptureId }
      : r
  );
  saveReminders(updated);
}

/** Reminders whose due time has passed and that haven't fired yet. */
export function getDueReminders(now: Date = new Date()): FollowUpReminder[] {
  return loadReminders().filter(
    (r) => !r.activated_at && new Date(r.due_at).getTime() <= now.getTime()
  );
}
