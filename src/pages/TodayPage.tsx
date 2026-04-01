import { useMemo, useState } from "react";
import { useBrain } from "@/context/BrainContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck, Clock, AlertTriangle, CheckCircle2, Zap,
  ArrowRight, Users, Timer, Check, PauseCircle, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import type { Capture, CaptureCategory } from "@/types/brain";

/* ── helpers ── */
const categoryLabel: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder", goal: "Goal", note: "Note",
  project: "Project", follow_up: "Follow-up", maybe_later: "Someday",
};

const priorityColor = (s: number) =>
  s >= 70 ? "text-brain-rose" : s >= 45 ? "text-brain-amber" : "text-muted-foreground";

const aiReasoning = (c: Capture) => c.ai_data?.why_it_matters ?? "";

/* ── mock "waiting" items ── */
const WAITING_ITEMS = [
  { id: "w1", title: "Client reply on proposal", depends: "Waiting on Acme Corp", nudge: "Send a friendly follow-up email", days: 3 },
  { id: "w2", title: "Accountant quarterly review", depends: "Waiting on Sarah (accountant)", nudge: "Check if documents were received", days: 5 },
  { id: "w3", title: "Design mockups from freelancer", depends: "Waiting on design contractor", nudge: "Ping on Slack with a deadline reminder", days: 2 },
];

/* ── mock "quick wins" ── */
const QUICK_WINS = [
  { id: "q1", title: "Confirm dentist appointment", effort: "2 min", done: false },
  { id: "q2", title: "Reply to team standup thread", effort: "3 min", done: false },
  { id: "q3", title: "Send invoice PDF to client", effort: "5 min", done: false },
];

export default function TodayPage() {
  const { captures, updateCaptureStatus } = useBrain();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [quickWins, setQuickWins] = useState(QUICK_WINS);

  /* ── derived data ── */
  const actionable = useMemo(() => {
    return captures
      .filter((c) => c.status !== "archived" && c.status !== "sent_to_ideas" && !snoozedIds.has(c.id))
      .filter((c) => c.status === "sent_to_today" || c.ai_data?.category === "task" || c.ai_data?.category === "reminder" || c.ai_data?.category === "follow_up")
      .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0));
  }, [captures, snoozedIds]);

  const mustDoFirst = actionable.filter((c) => !completedIds.has(c.id)).slice(0, 3);
  const planned = actionable.filter((c) => !completedIds.has(c.id)).slice(3);
  const completedCount = completedIds.size + quickWins.filter((q) => q.done).length;

  const stats = [
    { label: "Due Today", value: actionable.length, icon: CalendarCheck, color: "text-brain-teal" },
    { label: "High Priority", value: actionable.filter((c) => (c.ai_data?.priority_score ?? 0) >= 8).length, icon: AlertTriangle, color: "text-brain-rose" },
    { label: "Waiting", value: WAITING_ITEMS.length, icon: Users, color: "text-brain-amber" },
    { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-primary" },
  ];

  const markDone = (id: string) => {
    setCompletedIds((prev) => new Set(prev).add(id));
    updateCaptureStatus(id, "archived");
  };
  const snooze = (id: string) => setSnoozedIds((prev) => new Set(prev).add(id));
  const completeQuickWin = (id: string) =>
    setQuickWins((prev) => prev.map((q) => (q.id === id ? { ...q, done: true } : q)));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground mt-1">Your highest-leverage actions for the day.</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
          {format(new Date(), "EEEE, MMM d, yyyy")}
        </span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Must Do First */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brain-rose" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Must Do First</h2>
        </div>
        {mustDoFirst.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">All top priorities handled — nice work!</p>
        ) : (
          <div className="space-y-3">
            {mustDoFirst.map((c, i) => {
              const ai = c.ai_data!;
              return (
                <div key={c.id} className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <div>
                        <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{aiReasoning(c)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{categoryLabel[ai.category]}</Badge>
                      <span className={`text-xs font-bold ${priorityColor(ai.priority_score)}`}>{ai.priority_score}/100</span>
                    </div>
                  </div>
                  {ai.due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Due: {ai.due_date}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <ArrowRight className="h-3 w-3" /> {ai.next_action}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="default" className="text-xs h-7 gap-1" onClick={() => markDone(c.id)}>
                      <Check className="h-3 w-3" /> Done
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => snooze(c.id)}>
                      <PauseCircle className="h-3 w-3" /> Snooze
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1">
                      <ChevronRight className="h-3 w-3" /> Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Planned for Today */}
      {planned.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brain-blue" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Planned for Today</h2>
          </div>
          <div className="space-y-2">
            {planned.map((c) => {
              const ai = c.ai_data!;
              return (
                <div key={c.id} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {ai.due_date && <span className="text-[10px] font-mono text-muted-foreground shrink-0">{ai.due_date}</span>}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ai.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{ai.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ai.suggested_project && <span className="text-[10px] text-muted-foreground">{ai.suggested_project}</span>}
                    <Badge variant="secondary" className="text-[10px]">{categoryLabel[ai.category]}</Badge>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markDone(c.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Waiting / Follow-ups */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brain-amber" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Waiting / Follow-ups</h2>
        </div>
        <div className="space-y-2">
          {WAITING_ITEMS.map((w) => (
            <div key={w.id} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.depends} · {w.days}d waiting</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground hidden sm:block">{w.nudge}</span>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                  <ArrowRight className="h-3 w-3" /> Follow Up
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Wins */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-brain-teal" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Wins</h2>
        </div>
        <div className="space-y-2">
          {quickWins.map((q) => (
            <div key={q.id} className={`rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3 transition-opacity ${q.done ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{q.effort}</span>
                <p className={`text-sm font-medium ${q.done ? "line-through" : ""}`}>{q.title}</p>
              </div>
              <Button size="sm" variant={q.done ? "ghost" : "default"} className="text-xs h-7 gap-1" disabled={q.done} onClick={() => completeQuickWin(q.id)}>
                <Check className="h-3 w-3" /> {q.done ? "Done" : "Complete"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
