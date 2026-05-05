/**
 * MorningBriefingCard
 *
 * Shown at the top of Today page each morning. Computes entirely from local
 * BrainContext + GoalContext data — no API call needed.
 * Dismissed per-day via localStorage (key: ih_briefing_dismissed_<date>).
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sun, AlertTriangle, Target, Zap, CheckCircle2 } from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { useGoals } from "@/context/GoalContext";
import { format, isToday, isPast, parseISO } from "date-fns";

const todayKey = () => `ih_briefing_dismissed_${format(new Date(), "yyyy-MM-dd")}`;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function MorningBriefingCard() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(todayKey()));
  const { captures } = useBrain();
  const { goals, getGoalProgress } = useGoals();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Items pinned/routed to Today
    const todayItems = captures.filter(
      (c) => c.status !== "archived" && (c.is_pinned_today || c.ai_data?.destination === "today")
    );
    const completed = todayItems.filter((c) => c.is_completed).length;
    const remaining = todayItems.filter((c) => !c.is_completed).length;

    // Overdue: due_date is in the past and not completed
    const overdue = captures.filter((c) => {
      if (c.is_completed || c.status === "archived") return false;
      if (!c.ai_data?.due_date) return false;
      try {
        const d = parseISO(c.ai_data.due_date);
        return isPast(d) && !isToday(d);
      } catch { return false; }
    }).length;

    // Due today
    const dueToday = captures.filter((c) => {
      if (c.is_completed || c.status === "archived") return false;
      if (!c.ai_data?.due_date) return false;
      try { return isToday(parseISO(c.ai_data.due_date)); } catch { return false; }
    }).length;

    // Capture streak (consecutive days with at least one capture)
    const daySet = new Set(
      captures.map((c) => format(new Date(c.created_at), "yyyy-MM-dd"))
    );
    let streak = 0;
    const d = new Date();
    while (daySet.has(format(d, "yyyy-MM-dd"))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    // Top active goal progress
    const activeGoals = goals.filter((g) => g.status === "active");
    const topGoal = activeGoals.length > 0
      ? activeGoals.reduce((best, g) =>
          getGoalProgress(g) > getGoalProgress(best) ? g : best, activeGoals[0])
      : null;
    const topGoalPct = topGoal ? getGoalProgress(topGoal) : null;

    return { remaining, completed, overdue, dueToday, streak, topGoal, topGoalPct, today };
  }, [captures, goals, getGoalProgress]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent p-4 mb-2">
      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{getGreeting()} — {format(new Date(), "EEEE, MMM d")}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Today tasks */}
        <button
          onClick={() => navigate("/today")}
          className="flex items-center gap-2 rounded-lg bg-background/60 border px-3 py-2 text-left hover:border-primary/40 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-sm font-semibold">
              {stats.remaining > 0
                ? `${stats.remaining} remaining`
                : stats.completed > 0 ? "All done ✓" : "Empty"}
            </p>
          </div>
        </button>

        {/* Overdue */}
        {stats.overdue > 0 ? (
          <button
            onClick={() => navigate("/inbox?filter=overdue")}
            className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-left hover:border-rose-500/40 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-sm font-semibold text-rose-500">{stats.overdue} item{stats.overdue > 1 ? "s" : ""}</p>
            </div>
          </button>
        ) : stats.dueToday > 0 ? (
          <button
            onClick={() => navigate("/today")}
            className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-left hover:border-amber-500/40 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Due today</p>
              <p className="text-sm font-semibold text-amber-500">{stats.dueToday} item{stats.dueToday > 1 ? "s" : ""}</p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-background/60 border px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-sm font-semibold text-green-500">None</p>
            </div>
          </div>
        )}

        {/* Streak */}
        <div className="flex items-center gap-2 rounded-lg bg-background/60 border px-3 py-2">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="text-sm font-semibold">{stats.streak} day{stats.streak !== 1 ? "s" : ""} {stats.streak >= 3 ? "🔥" : ""}</p>
          </div>
        </div>

        {/* Top goal */}
        {stats.topGoal ? (
          <button
            onClick={() => navigate("/goals")}
            className="flex items-center gap-2 rounded-lg bg-background/60 border px-3 py-2 text-left hover:border-primary/40 transition-colors"
          >
            <Target className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Top goal</p>
              <p className="text-sm font-semibold truncate">{stats.topGoalPct}%</p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate("/goals")}
            className="flex items-center gap-2 rounded-lg bg-background/60 border px-3 py-2 text-left hover:border-primary/40 transition-colors"
          >
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Goals</p>
              <p className="text-sm font-semibold text-muted-foreground">Set one</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
