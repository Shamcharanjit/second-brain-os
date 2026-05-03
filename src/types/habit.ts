/**
 * Habit types for recurring daily/weekly habits in the Today view.
 */

export type HabitFrequency = "daily" | "weekdays" | "weekly";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: HabitFrequency;
  /** ISO date strings (YYYY-MM-DD) of days this habit was marked complete */
  completions: string[];
  created_at: string;
  archived: boolean;
  /** Optional time-of-day reminder label */
  time_of_day?: "morning" | "afternoon" | "evening" | null;
}
