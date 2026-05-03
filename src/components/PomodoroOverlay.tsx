/**
 * PomodoroOverlay — Floating focus-mode timer.
 * Uses usePomodoroTimer hook for all state.
 * Renders as a fixed card in bottom-right when active.
 */

import { usePomodoroTimer, SessionType } from "@/hooks/usePomodoroTimer";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, RotateCcw, Coffee, Brain, Timer } from "lucide-react";
import { createContext, useContext } from "react";

// ── Context so TodayPage (and anywhere) can call start() ──────────────────────
export const PomodoroContext = createContext<ReturnType<typeof usePomodoroTimer> | null>(null);
export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoroContext must be inside PomodoroProvider");
  return ctx;
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const timer = usePomodoroTimer();
  return <PomodoroContext.Provider value={timer}>{children}</PomodoroContext.Provider>;
}

// ── SVG ring ──────────────────────────────────────────────────────────────────
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

function Ring({ progress, color }: { progress: number; color: string }) {
  const dash = CIRC * (1 - progress);
  return (
    <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
      <circle cx="68" cy="68" r={RADIUS} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
      <circle
        cx="68" cy="68" r={RADIUS} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={CIRC}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

const SESSION_CONFIG: Record<SessionType, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  focus:       { label: "Focus",       color: "hsl(var(--primary))",        icon: Brain,  bg: "bg-primary/10" },
  short_break: { label: "Short Break", color: "hsl(var(--brain-teal))",     icon: Coffee, bg: "bg-[hsl(var(--brain-teal))/0.1]" },
  long_break:  { label: "Long Break",  color: "hsl(var(--brain-blue))",     icon: Timer,  bg: "bg-[hsl(var(--brain-blue))/0.1]" },
};

export default function PomodoroOverlay() {
  const timer = usePomodoroContext();
  if (!timer.isVisible) return null;

  const cfg = SESSION_CONFIG[timer.sessionType];
  const Icon = cfg.icon;

  return (
    <div
      className="fixed bottom-24 right-4 md:bottom-8 md:right-24 z-50 w-64 rounded-2xl border bg-card shadow-2xl overflow-hidden"
      style={{ boxShadow: `0 8px 40px ${cfg.color}33` }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${cfg.bg} border-b border-border/50`}>
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          {timer.focusToday > 0 && (
            <span className="text-[9px] text-muted-foreground ml-1">
              {timer.focusToday} session{timer.focusToday !== 1 ? "s" : ""} today
            </span>
          )}
        </div>
        <button onClick={timer.close} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center px-4 py-4 gap-3">
        <div className="relative flex items-center justify-center">
          <Ring progress={timer.progress} color={cfg.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono tracking-tight">{timer.display}</span>
            {timer.taskLabel && (
              <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[80px] truncate text-center">
                {timer.taskLabel}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={timer.reset}
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-9 px-5 gap-1.5 text-xs font-semibold"
            style={{ background: cfg.color, color: "hsl(var(--primary-foreground))" }}
            onClick={timer.isRunning ? timer.pause : timer.resume}
          >
            {timer.isRunning
              ? <><Pause className="h-3.5 w-3.5" /> Pause</>
              : <><Play className="h-3.5 w-3.5" /> {timer.secondsLeft < (timer.sessionType === "focus" ? 1500 : timer.sessionType === "short_break" ? 300 : 900) ? "Resume" : "Start"}</>
            }
          </Button>
        </div>

        {/* Session type switcher */}
        <div className="flex gap-1 w-full">
          {(["focus", "short_break", "long_break"] as SessionType[]).map((t) => (
            <button
              key={t}
              onClick={() => timer.switchType(t)}
              className={`flex-1 rounded-md py-1 text-[9px] font-medium transition-colors ${
                timer.sessionType === t
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t === "focus" ? "Focus" : t === "short_break" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
