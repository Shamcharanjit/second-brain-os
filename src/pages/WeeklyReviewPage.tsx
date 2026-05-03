/**
 * WeeklyReviewPage — AI-powered weekly brain debrief
 *
 * Automatically summarises the last 7 days:
 *   - Captures created, by category breakdown
 *   - Projects with activity / stalled projects
 *   - Ideas generated
 *   - Completed tasks
 *   - Pending / unprocessed items
 *   - AI-written week summary + recommended focus for next week
 *
 * Route: /review/weekly
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, CalendarRange, CheckCircle2, Inbox, FolderKanban,
  Lightbulb, BrainCircuit, AlertTriangle, ArrowRight, Loader2,
  Trophy, Target, Flame, RotateCcw, Brain, TrendingUp, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { trackEvent } from "@/lib/analytics/ga4";
import type { AIProcessedData } from "@/types/brain";

/* ── Helpers ── */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isThisWeek(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < ONE_WEEK_MS;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

/* ── AI summary generator (client-side, no API call needed) ── */
function generateWeeklySummary(stats: {
  total: number;
  completed: number;
  ideas: number;
  pending: number;
  topCategories: string[];
  projectsActive: number;
  projectsStalled: number;
}): { headline: string; insight: string; focusNext: string } {
  const { total, completed, ideas, pending, topCategories, projectsActive, projectsStalled } = stats;

  if (total === 0) {
    return {
      headline: "A quiet week — time to build the habit.",
      insight: "You didn't capture anything this week. Even one thought a day adds up. Start small: capture one idea right now.",
      focusNext: "Make one capture every day next week. Open the app and type whatever's on your mind — no filter needed.",
    };
  }

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const category = topCategories[0] ?? "general";

  let headline = "";
  let insight = "";
  let focusNext = "";

  if (total >= 20) {
    headline = `Productive week — ${total} captures, ${completed} completed.`;
  } else if (total >= 10) {
    headline = `Solid week — ${total} captures across ${topCategories.length} categories.`;
  } else if (total >= 5) {
    headline = `Good start — ${total} captures this week.`;
  } else {
    headline = `Light week — ${total} capture${total > 1 ? "s" : ""} logged.`;
  }

  if (ideas >= 3) {
    insight = `You're in an ideas-rich phase — ${ideas} new ideas this week, mostly around ${capitalize(category)}. Spend time refining the best ones before the energy fades.`;
  } else if (completionRate >= 70) {
    insight = `Strong execution week — you completed ${completionRate}% of your captures. The challenge now is to keep filling the queue with meaningful inputs.`;
  } else if (pending >= 5) {
    insight = `You have ${pending} unprocessed items. They're not gone — they're waiting. Your first task next week is to clear the backlog so nothing important stays buried.`;
  } else if (projectsStalled > 0) {
    insight = `${projectsStalled} project${projectsStalled > 1 ? "s are" : " is"} stalled. Progress compounds — even one small action per project per week keeps momentum going.`;
  } else {
    insight = `Your top capture theme this week was ${capitalize(category)}. That pattern is a signal — it might be worth creating a dedicated project around it.`;
  }

  if (projectsActive > 0) {
    focusNext = `You have ${projectsActive} active project${projectsActive > 1 ? "s" : ""}. Pick the single most important one and add a concrete next action at the start of the week.`;
  } else if (ideas >= 2) {
    focusNext = `Convert one of your ${ideas} ideas into a real project. Give it a name, a goal, and one next action. That's all it takes to go from idea to momentum.`;
  } else {
    focusNext = `This week, aim for ${Math.max(total + 3, 7)} captures. Volume builds the habit — don't filter, just capture and let AI organise.`;
  }

  return { headline, insight, focusNext };
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color, sublabel }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export default function WeeklyReviewPage() {
  const navigate = useNavigate();
  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { markWeeklyComplete } = useReviewMeta();
  const [marked, setMarked] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSummaryVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  /* ── Week data ── */
  const weekCaptures = useMemo(() => captures.filter((c) => isThisWeek(c.created_at)), [captures]);
  const weekCompleted = useMemo(() => weekCaptures.filter((c) => c.is_completed), [weekCaptures]);
  const weekIdeas = useMemo(() => weekCaptures.filter((c) => c.status === "sent_to_ideas"), [weekCaptures]);
  const weekPending = useMemo(() => captures.filter((c) =>
    c.review_status === "needs_review" && c.status !== "archived"
  ), [captures]);

  const activeProjects = useMemo(() => projects.filter((p) => p.status === "active"), [projects]);
  const stalledProjects = useMemo(() => activeProjects.filter((p) => getProjectHealth(p) === "stalled"), [activeProjects, getProjectHealth]);
  const atRiskProjects = useMemo(() => activeProjects.filter((p) => getProjectHealth(p) === "at_risk"), [activeProjects, getProjectHealth]);

  /* ── Category breakdown ── */
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    weekCaptures.forEach((c) => {
      const cat = (c.ai_data as AIProcessedData | null)?.category ?? "uncategorized";
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [weekCaptures]);

  const topCategories = categoryBreakdown.map(([cat]) => cat);

  /* ── AI summary ── */
  const summary = useMemo(() => generateWeeklySummary({
    total: weekCaptures.length,
    completed: weekCompleted.length,
    ideas: weekIdeas.length,
    pending: weekPending.length,
    topCategories,
    projectsActive: activeProjects.length,
    projectsStalled: stalledProjects.length,
  }), [weekCaptures, weekCompleted, weekIdeas, weekPending, topCategories, activeProjects, stalledProjects]);

  /* ── Projects with activity this week ── */
  const projectsWithActivity = useMemo(() =>
    activeProjects
      .filter((p) => {
        const hasRecentCapture = captures.some((c) =>
          c.source_project_id === p.id && isThisWeek(c.created_at)
        );
        const hasRecentUpdate = isThisWeek(p.last_updated);
        return hasRecentCapture || hasRecentUpdate;
      })
      .slice(0, 5),
    [activeProjects, captures]
  );

  const healthColor = (health: string) => {
    if (health === "healthy") return "text-[hsl(var(--brain-teal))]";
    if (health === "at_risk") return "text-[hsl(var(--brain-amber))]";
    return "text-destructive";
  };

  function handleMarkDone() {
    markWeeklyComplete();
    setMarked(true);
    trackEvent("weekly_review_completed", { captures_this_week: weekCaptures.length });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Weekly Brain Review</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI summary of the last 7 days — what you captured, what moved, what needs attention.
          </p>
        </div>
        {!marked ? (
          <Button onClick={handleMarkDone} className="gap-2 shrink-0">
            <Trophy className="h-4 w-4" /> Mark complete
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" /> Week reviewed!
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Flame} label="Captures" value={weekCaptures.length} color="text-primary" sublabel="this week" />
        <StatCard icon={CheckCircle2} label="Completed" value={weekCompleted.length} color="text-[hsl(var(--brain-teal))]" sublabel="tasks done" />
        <StatCard icon={Lightbulb} label="Ideas" value={weekIdeas.length} color="text-[hsl(var(--brain-purple))]" sublabel="added to vault" />
        <StatCard icon={Inbox} label="Needs Review" value={weekPending.length} color="text-[hsl(var(--brain-amber))]" sublabel="in queue" />
      </div>

      {/* AI Summary */}
      {summaryVisible && (
        <section className={`space-y-4 transition-all duration-500 ${summaryVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Week Summary</h2>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-base font-semibold text-foreground">{summary.headline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{summary.insight}</p>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Focus for next week
              </p>
              <p className="text-sm text-foreground leading-relaxed">{summary.focusNext}</p>
            </div>
          </div>
        </section>
      )}

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capture Breakdown</h2>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-3">
            {categoryBreakdown.map(([cat, count]) => {
              const pct = weekCaptures.length > 0 ? Math.round((count / weekCaptures.length) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize">{capitalize(cat)}</span>
                    <span className="text-muted-foreground">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Projects this week */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Projects</h2>
          </div>
          <button onClick={() => navigate("/projects")} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <FolderKanban className="h-6 w-6 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>Create a project</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Stalled / at-risk first */}
            {[...stalledProjects, ...atRiskProjects].slice(0, 3).map((p) => {
              const health = getProjectHealth(p);
              return (
                <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${healthColor(health)}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{health.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs shrink-0 gap-1" onClick={() => navigate("/projects")}>
                    Fix <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            {/* Active with activity */}
            {projectsWithActivity.filter((p) => getProjectHealth(p) === "healthy").slice(0, 3).map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--brain-teal))]" />
                  <p className="text-sm font-medium truncate">{p.name}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] shrink-0">Active</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* This week's top ideas */}
      {weekIdeas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ideas This Week</h2>
            </div>
            <button onClick={() => navigate("/ideas")} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Ideas vault <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {weekIdeas.slice(0, 5).map((c) => {
              const ai = c.ai_data as AIProcessedData | null;
              const title = ai?.title || c.raw_input.slice(0, 70);
              return (
                <div key={c.id} className="rounded-xl border bg-card p-3 flex items-start gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--brain-purple))] shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-snug">{title}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending review queue */}
      {weekPending.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Needs Your Attention</h2>
          </div>
          <div className="rounded-xl border border-amber-200/40 bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              {weekPending.length} capture{weekPending.length > 1 ? "s" : ""} need review before they can be routed. Clear them to keep your brain organised.
            </p>
            <Button size="sm" onClick={() => navigate("/ai-review")} className="gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5" /> Review now
            </Button>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <div className="rounded-xl border bg-muted/20 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Run your full weekly review</p>
          <p className="text-xs text-muted-foreground mt-0.5">Step through Inbox → Projects → Ideas → Memory in one guided session.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/review")} className="gap-1.5 shrink-0">
          <RotateCcw className="h-3.5 w-3.5" /> Full review
        </Button>
      </div>
    </div>
  );
}
