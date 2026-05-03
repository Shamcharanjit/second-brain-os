/**
 * HabitContext — Manages recurring habits.
 *
 * Habits live in localStorage only (small data, no cloud sync needed for now).
 * Exposed operations: create, toggle completion, edit, archive.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Habit, HabitFrequency } from "@/types/habit";
import { loadState, saveState } from "@/lib/persistence";
import { useEffect } from "react";
import { format } from "date-fns";

const STORAGE_KEY = "insighthalo_habits";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Streak = consecutive days completed up to today */
function computeStreak(habit: Habit): number {
  const comps = new Set(habit.completions);
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = format(d, "yyyy-MM-dd");
    if (!comps.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Whether this habit is due today based on frequency */
function isDueToday(habit: Habit): boolean {
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") {
    const day = new Date().getDay(); // 0=Sun, 6=Sat
    return day >= 1 && day <= 5;
  }
  if (habit.frequency === "weekly") {
    // Due on the day of week the habit was created
    const createdDay = new Date(habit.created_at).getDay();
    return new Date().getDay() === createdDay;
  }
  return true;
}

interface HabitContextType {
  habits: Habit[];
  todayHabits: Habit[];
  createHabit: (name: string, emoji: string, frequency: HabitFrequency, timeOfDay?: Habit["time_of_day"]) => void;
  toggleToday: (id: string) => void;
  isCompletedToday: (id: string) => boolean;
  getStreak: (id: string) => number;
  editHabit: (id: string, updates: Partial<Pick<Habit, "name" | "emoji" | "frequency" | "time_of_day">>) => void;
  archiveHabit: (id: string) => void;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(() =>
    loadState<Habit[]>(STORAGE_KEY, []).filter((h) => !h.archived)
  );

  useEffect(() => { saveState(STORAGE_KEY, habits); }, [habits]);

  const todayHabits = useMemo(
    () => habits.filter((h) => !h.archived && isDueToday(h)),
    [habits]
  );

  const createHabit = useCallback((
    name: string,
    emoji: string,
    frequency: HabitFrequency,
    timeOfDay: Habit["time_of_day"] = null,
  ) => {
    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      emoji,
      frequency,
      completions: [],
      created_at: new Date().toISOString(),
      archived: false,
      time_of_day: timeOfDay,
    };
    setHabits((prev) => [habit, ...prev]);
  }, []);

  const toggleToday = useCallback((id: string) => {
    const today = todayStr();
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const done = h.completions.includes(today);
      return {
        ...h,
        completions: done
          ? h.completions.filter((d) => d !== today)
          : [...h.completions, today],
      };
    }));
  }, []);

  const isCompletedToday = useCallback(
    (id: string) => {
      const h = habits.find((x) => x.id === id);
      return h ? h.completions.includes(todayStr()) : false;
    },
    [habits]
  );

  const getStreak = useCallback(
    (id: string) => {
      const h = habits.find((x) => x.id === id);
      return h ? computeStreak(h) : 0;
    },
    [habits]
  );

  const editHabit = useCallback((id: string, updates: Partial<Pick<Habit, "name" | "emoji" | "frequency" | "time_of_day">>) => {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, ...updates } : h));
  }, []);

  const archiveHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return (
    <HabitContext.Provider value={{
      habits, todayHabits, createHabit, toggleToday, isCompletedToday, getStreak, editHabit, archiveHabit,
    }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used within HabitProvider");
  return ctx;
}
