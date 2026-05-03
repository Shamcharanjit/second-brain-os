/**
 * AnalyticsPage — Personal analytics dashboard.
 * Charts: capture volume, category breakdown, priority distribution, weekly rhythm.
 */

import { useMemo } from "react";
import { useBrain } from "@/context/BrainContext";
import { useGoals } from "@/context/GoalContext";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";
import { TrendingUp, Brain, Target, Timer, Flame, CheckCircle2, Lightbulb, Inbox } from "lucide-react";
import type { CaptureCategory } from "@/types/brain";

// ── Palette ───────────────────────────────────────────────────────────────────
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--brain-teal))",
  "hsl(var(--brain-amber))",
  "hsl(var(--brain-rose))",
  "hsl(var(--brain-purple))",
  "hsl(var(--brain-blue))",
];

const CATEGORY_COLOR: Record<string, string> = {
  task:       COLORS[0],
  idea:       COLORS[1],
  reminder:   COLORS[2],
  goal:       COLORS[3],
  note:       COLORS[4],
  project:    COLORS[5],
  follow_up:  COLORS[2],
  maybe_later:COLORS[4],
};

// ── Tooltip styles ────────────────────────────────────────────────────────────
const TooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 11,
    color: "hsl(var(--foreground))",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  },
  cursor: { fill: "hsl(var(--muted))" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { captures } = useBrain();
  const { goals } = useGoals();
  // usePomodoroTimer reads from localStorage — no provider needed here
  const { sessions: pomodoroSessions } = usePomodoroTimer();

  const todayKey = new Date().toISOString().slice(0, 10);

  // ── KPI numbers ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = captures.length;
    const completed = captures.filter((c) => c.status === "completed").length;
    const ideas = captures.filter((c) => c.ai_data?.category === "idea").length;
    const today = captures.filter((c) => c.created_at.slice(0, 10) === todayKey).length;
    const focusToday = pomodoroSessions.filter((s) => s.type === "focus" && s.completedAt.slice(0, 10) === todayKey).length;
    const focusMinutes = focusToday * 25;
    const streak = (() => {
      let s = 0;
      const d = new Date();
      while (true) {
        const key = d.toISOString().slice(0, 10);
        if (!captures.some((c) => c.created_at.slice(0, 10) === key)) break;
        s++;
        d.setDate(d.getDate() - 1);
      }
      return s;
    })();
    const activeGoals = goals.filter((g) => g.status === "active" && g.status !== ("archived" as any)).length;
    return { total, completed, ideas, today, focusToday, focusMinutes, streak, activeGoals };
  }, [captures, goals, pomodoroSessions, todayKey]);

  // ── 30-day capture volume (line chart) ───────────────────────────────────
  const volumeData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const count = captures.filter((c) => c.created_at.slice(0, 10) === key).length;
      return { date: format(day, "MMM d"), count };
    });
  }, [captures]);

  // ── Category breakdown (pie) ──────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    captures.forEach((c) => {
      const cat = c.ai_data?.category ?? "note";
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [captures]);

  // ── Priority distribution (bar chart) ────────────────────────────────────
  const priorityData = useMemo(() => {
    const buckets = [
      { name: "Critical (80+)", range: [80, 100] },
      { name: "High (60–79)",   range: [60, 79] },
      { name: "Medium (40–59)", range: [40, 59] },
      { name: "Low (<40)",      range: [0,  39] },
    ];
    return buckets.map(({ name, range }) => ({
      name,
      count: captures.filter((c) => {
        const p = c.ai_data?.priority_score ?? 50;
        return p >= range[0] && p <= range[1];
      }).length,
    }));
  }, [captures]);

  // ── Weekly rhythm (bar chart: avg captures per day of week) ──────────────
  const weekdayData = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0);
    const weeks = Array(7).fill(0);
    captures.forEach((c) => {
      const d = new Date(c.created_at);
      const day = d.getDay();
      counts[day]++;
    });
    // Simple sum (not normalized to weeks for simplicity)
    return labels.map((name, i) => ({ name, captures: counts[i] }));
  }, [captures]);

  // ── Pomodoro sessions last 14 days ────────────────────────────────────────
  const pomodoroData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const sessions = pomodoroSessions.filter((s) => s.type === "focus" && s.completedAt.slice(0, 10) === key).length;
      return { date: format(day, "MMM d"), sessions, minutes: sessions * 25 };
    });
  }, [pomodoroSessions]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal second-brain performance at a glance.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Captures" value={stats.total} icon={Inbox} color="text-primary" />
        <StatCard label="Completed" value={stats.completed} sub={`${stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}% completion`} icon={CheckCircle2} color="text-[hsl(var(--brain-teal))]" />
        <StatCard label="Ideas" value={stats.ideas} icon={Lightbulb} color="text-[hsl(var(--brain-amber))]" />
        <StatCard label="Active Goals" value={stats.activeGoals} icon={Target} color="text-[hsl(var(--brain-purple))]" />
        <StatCard label="Today" value={stats.today} sub="captures today" icon={Brain} color="text-primary" />
        <StatCard label="Focus Today" value={`${stats.focusMinutes}m`} sub={`${stats.focusToday} sessions`} icon={Timer} color="text-[hsl(var(--brain-blue))]" />
        <StatCard label="Capture Streak" value={`${stats.streak}d`} sub={stats.streak > 0 ? "consecutive days" : "Start capturing daily!"} icon={Flame} color="text-[hsl(var(--brain-rose))]" />
        <StatCard label="Avg / Day (30d)" value={volumeData.length > 0 ? (captures.filter((c) => new Date(c.created_at) >= subDays(new Date(), 29)).length / 30).toFixed(1) : "0"} icon={TrendingUp} color="text-[hsl(var(--brain-teal))]" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 30-day volume */}
        <div className="md:col-span-2">
          <Section title="Capture Volume — Last 30 Days">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={volumeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip {...TooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Captures" />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Category pie */}
        <Section title="By Category">
          {categoryData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No data yet</p>
          ) : (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28} paddingAngle={2}>
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLOR[entry.name] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {categoryData.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: CATEGORY_COLOR[d.name] ?? COLORS[i % COLORS.length] }} />
                      <span className="capitalize text-muted-foreground">{d.name.replace("_", " ")}</span>
                    </div>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Priority distribution */}
        <Section title="Priority Distribution">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={priorityData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="count" name="Captures" radius={[4, 4, 0, 0]}>
                {priorityData.map((_, i) => (
                  <Cell key={i} fill={[COLORS[3], COLORS[2], COLORS[0], COLORS[4]][i] ?? COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Weekly rhythm */}
        <Section title="Weekly Rhythm">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="captures" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Captures" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Focus sessions */}
      {pomodoroSessions.length > 0 && (
        <Section title="Focus Sessions — Last 14 Days">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={pomodoroData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={3} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip {...TooltipStyle} formatter={(v, n) => [v, n === "sessions" ? "Sessions" : "Minutes"]} />
              <Bar dataKey="sessions" fill="hsl(var(--brain-blue))" radius={[4, 4, 0, 0]} name="sessions" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}
    </div>
  );
}
