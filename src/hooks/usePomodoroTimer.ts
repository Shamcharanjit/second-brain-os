/**
 * usePomodoroTimer — Manages a Pomodoro timer.
 *
 * Session types: focus (25 min), short break (5 min), long break (15 min).
 * Every 4 focus sessions → long break.
 * Tracks completed sessions in localStorage.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type SessionType = "focus" | "short_break" | "long_break";

export interface PomodoroSession {
  type: SessionType;
  taskLabel: string | null;
  completedAt: string;
}

const DURATIONS: Record<SessionType, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const STORAGE_KEY = "insighthalo_pomodoro";

function loadSessions(): PomodoroSession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

export function usePomodoroTimer() {
  const [sessions, setSessions] = useState<PomodoroSession[]>(loadSessions);
  const [sessionType, setSessionType] = useState<SessionType>("focus");
  const [taskLabel, setTaskLabel] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist sessions
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }, [sessions]);

  // Tick
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, sessionType, taskLabel]);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    const session: PomodoroSession = {
      type: sessionType,
      taskLabel,
      completedAt: new Date().toISOString(),
    };
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, 200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    // Auto-suggest next session
    if (sessionType === "focus") {
      const focusToday = sessions.filter((s) => s.type === "focus" && s.completedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length + 1;
      const next: SessionType = focusToday % 4 === 0 ? "long_break" : "short_break";
      setSessionType(next);
      setSecondsLeft(DURATIONS[next]);
    } else {
      setSessionType("focus");
      setSecondsLeft(DURATIONS.focus);
    }
    // Browser notification
    if (Notification.permission === "granted") {
      new Notification("InsightHalo — Session complete!", {
        body: sessionType === "focus" ? "Great work! Time for a break." : "Break over — back to focus!",
        icon: "/favicon.ico",
      });
    }
  }, [sessionType, taskLabel, sessions]);

  const start = useCallback((label?: string) => {
    setTaskLabel(label ?? null);
    setIsRunning(true);
    setIsVisible(true);
  }, []);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(DURATIONS[sessionType]);
  }, [sessionType]);

  const switchType = useCallback((type: SessionType) => {
    setIsRunning(false);
    setSessionType(type);
    setSecondsLeft(DURATIONS[type]);
  }, []);

  const close = useCallback(() => {
    setIsRunning(false);
    setIsVisible(false);
    setSecondsLeft(DURATIONS[sessionType]);
  }, [sessionType]);

  // Today stats
  const todayKey = new Date().toISOString().slice(0, 10);
  const focusToday = sessions.filter((s) => s.type === "focus" && s.completedAt.slice(0, 10) === todayKey).length;
  const focusMinutesToday = focusToday * 25;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / DURATIONS[sessionType];
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    isVisible, sessionType, taskLabel, isRunning,
    secondsLeft, minutes, seconds, display, progress,
    focusToday, focusMinutesToday, sessions,
    start, pause, resume, reset, switchType, close,
    setIsVisible, setTaskLabel, setSessionType, setSecondsLeft,
  };
}
