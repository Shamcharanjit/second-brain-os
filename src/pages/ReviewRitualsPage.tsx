import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun, Moon, CalendarRange, Inbox, CalendarCheck, BrainCircuit,
  Lightbulb, FolderKanban, ArrowRight, Sparkles, Trash2, CheckCircle2,
  AlertTriangle, TrendingUp, Target, Flame, Zap, Clock, RotateCcw,
  Trophy, Archive, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/context/BrainContext";

type ReviewTab = "daily" | "weekly";

/* ── Mock streak data ── */
const MOCK_STREAK = { dailyStreak: 5, lastWeekly: "3 days ago", monthTotal: 18 };

/* ── Mock weekly wins ── */
const MOCK_WINS = [
  "Completed client proposal for clinic project",
  "Set up analytics tracking on landing page",
  "Resolved GST issue with accountant",
  "Captured 4 new product ideas",
];

export default function ReviewRitualsPage() {
  const { captures } = useBrain();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReviewTab>("daily");
  const [dailyComplete, setDailyComplete] = useState(false);
  const [weeklyComplete, setWeeklyComplete] = useState(false);

  /* ── Computed data ── */
  const unprocessed = useMemo(() => captures.filter((c) => c.status === "unprocessed"), [captures]);
  const todayTasks = useMemo(() => captures.filter((c) =>
    c.status !== "archived" && (c.status === "sent_to_today" || c.ai_data?.due_context === "today" || c.ai_data?.category === "reminder")
  ), [captures]);
  const pendingReview = useMemo(() => captures.filter((c) => c.review_status === "needs_review" && c.status === "unprocessed"), [captures]);
  const ideas = useMemo(() => captures.filter((c) =>
    c.status !== "archived" && (c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later")
  ), [captures]);
  const followUps = useMemo(() => captures.filter((c) =>
    c.status !== "archived" && c.ai_data?.category === "follow_up"
  ), [captures]);
  const urgentItems = useMemo(() => captures.filter((c) =>
    c.status !== "archived" && c.ai_data?.urgency === "high"
  ).sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0)).slice(0, 5), [captures]);
  const staleItems = useMemo(() => captures.filter((c) =>
    c.status === "unprocessed" && (Date.now() - new Date(c.created_at).getTime()) > 3 * 86400000
  ), [captures]);
  const completedMock = 7; // mock completed tasks this week
  const carryovers = useMemo(() => captures.filter((c) =>
    c.status === "unprocessed" && c.ai_data?.due_context === "today" && (Date.now() - new Date(c.created_at).getTime()) > 86400000
  ).slice(0, 3), [captures]);

  /* ── Daily AI suggestions ── */
  const dailySuggestions = useMemo(() => {
    const suggestions: { text: string; reason: string; destination: string; action: string }[] = [];
    if (pendingReview.length > 0) suggestions.push({
      text: `Review ${pendingReview.length} ambiguous capture${pendingReview.length > 1 ? "s" : ""} in AI Review`,
      reason: "Unresolved items create mental clutter",
      destination: "/ai-review", action: "Open AI Review",
    });
    const urgentTask = urgentItems[0];
    if (urgentTask) suggestions.push({
      text: urgentTask.ai_data?.title || "Handle urgent item",
      reason: urgentTask.ai_data?.why_it_matters || "Time-sensitive",
      destination: "/today", action: "Open Today",
    });
    if (ideas.length > 3) suggestions.push({
      text: "Convert a strong idea from Ideas Vault into a project task",
      reason: "Ideas without action lose value over time",
      destination: "/ideas", action: "Open Ideas Vault",
    });
    if (suggestions.length < 3) suggestions.push({
      text: "Check Projects page for stalled workstreams",
      reason: "Regular momentum checks prevent drift",
      destination: "/projects", action: "Open Projects",
    });
    return suggestions.slice(0, 3);
  }, [pendingReview, urgentItems, ideas]);

  /* ── Weekly AI recommendations ── */
  const weeklyRecs = useMemo(() => {
    const recs: { text: string; why: string; action: string; dest: string }[] = [];
    if (staleItems.length > 0) recs.push({
      text: `Resolve ${staleItems.length} stale capture${staleItems.length > 1 ? "s" : ""} sitting in Inbox for 3+ days`,
      why: "Old unprocessed items indicate decision debt", action: "Review Inbox", dest: "/inbox",
    });
    if (ideas.length > 2) recs.push({
      text: `Convert ${Math.min(2, ideas.length)} strong ideas into active project tasks`,
      why: "Ideas lose momentum without action plans", action: "Open Ideas Vault", dest: "/ideas",
    });
    recs.push({
      text: "Review Growth Experiments project — check momentum",
      why: "Strategic projects need weekly attention", action: "Open Projects", dest: "/projects",
    });
    if (followUps.length > 0) recs.push({
      text: `Follow up on ${followUps.length} pending item${followUps.length > 1 ? "s" : ""}`,
      why: "Pending follow-ups can block progress", action: "Open Inbox", dest: "/inbox",
    });
    recs.push({
      text: "Move tax-related items into Finance & Admin with due dates",
      why: "Financial tasks with deadlines prevent last-minute stress", action: "Open Projects", dest: "/projects",
    });
    return recs.slice(0, 5);
  }, [staleItems, ideas, followUps]);

  /* ── Mock project momentum ── */
  const projectMomentum = [
    { name: "Client Work", progress: 68, movement: "+12%", risk: "on_track" as const, milestone: "Deliver proposal draft" },
    { name: "Product Development", progress: 42, movement: "+5%", risk: "at_risk" as const, milestone: "Finalize MVP scope" },
    { name: "Finance & Admin", progress: 80, movement: "+20%", risk: "on_track" as const, milestone: "Complete GST filing" },
    { name: "Growth Experiments", progress: 25, movement: "+2%", risk: "at_risk" as const, milestone: "Launch pricing test" },
    { name: "Personal Operations", progress: 55, movement: "+8%", risk: "on_track" as const, milestone: "Set up weekly planning" },
  ];

  const riskColor = (r: string) => r === "on_track" ? "text-[hsl(var(--brain-teal))]" : "text-[hsl(var(--brain-amber))]";

  /* ── KPI cards per tab ── */
  const dailyKpis = [
    { label: "Unprocessed", value: unprocessed.length, icon: Inbox, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Today's Priorities", value: todayTasks.length, icon: CalendarCheck, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Pending Review", value: pendingReview.length, icon: BrainCircuit, color: "text-primary" },
    { label: "Carryovers", value: carryovers.length, icon: RotateCcw, color: "text-[hsl(var(--brain-rose))]" },
  ];

  const weeklyKpis = [
    { label: "Captures This Week", value: captures.length, icon: Inbox, color: "text-primary" },
    { label: "Completed", value: completedMock, icon: CheckCircle2, color: "text-[hsl(var(--brain-teal))]" },
    { label: "New Ideas", value: ideas.length, icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]" },
    { label: "Still Unclear", value: staleItems.length, icon: AlertTriangle, color: "text-[hsl(var(--brain-amber))]" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Rituals</h1>
        <p className="text-sm text-muted-foreground mt-1">Turn captures into clarity with daily and weekly reflection.</p>
      </div>

      {/* Microcopy */}
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-sm font-medium text-foreground italic">"Your best decisions come after review."</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">A few minutes of review saves hours of mental drag.</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("daily")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-all ${
            tab === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Sun className="h-4 w-4" /> Daily Review
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-all ${
            tab === "weekly" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <CalendarRange className="h-4 w-4" /> Weekly Review
        </button>
      </div>

      {/* ═══════════════ DAILY REVIEW ═══════════════ */}
      {tab === "daily" && !dailyComplete && (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dailyKpis.map((k) => (
              <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{k.value}</p>
              </div>
            ))}
          </div>

          {/* What Needs Attention */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What Needs Attention Today?</h2>
            </div>
            {urgentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing urgent — you're in great shape.</p>
            ) : (
              <div className="space-y-2">
                {urgentItems.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brain-amber))/0.12] flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.ai_data?.next_action}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] shrink-0 capitalize">{c.ai_data?.urgency}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Suggested Focus */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Suggested Focus</h2>
            </div>
            <div className="space-y-2">
              {dailySuggestions.map((s, i) => (
                <div key={i} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{s.text}</p>
                    <p className="text-[10px] text-muted-foreground italic">{s.reason}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs gap-1 shrink-0" onClick={() => navigate(s.destination)}>
                    {s.action} <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Clear the Noise */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clear the Noise</h2>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-2">
              {staleItems.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{staleItems.length} stale capture{staleItems.length > 1 ? "s" : ""} to archive or decide</span>
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate("/inbox")}>
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Dismiss outdated reminders</span>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate("/today")}>
                  Open Today <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Convert loose notes into tasks or ideas</span>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate("/ai-review")}>
                  AI Review <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Inbox", to: "/inbox", icon: Inbox },
              { label: "Today", to: "/today", icon: CalendarCheck },
              { label: "AI Review", to: "/ai-review", icon: BrainCircuit },
              { label: "Projects", to: "/projects", icon: FolderKanban },
              { label: "Ideas Vault", to: "/ideas", icon: Lightbulb },
            ].map((l) => (
              <Button key={l.to} size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate(l.to)}>
                <l.icon className="h-3 w-3" /> {l.label}
              </Button>
            ))}
          </div>

          {/* Start My Day */}
          <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => setDailyComplete(true)}>
            <Sun className="h-5 w-5" /> Start My Day
          </Button>
        </div>
      )}

      {tab === "daily" && dailyComplete && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Daily Review Complete</h3>
          <p className="text-sm text-muted-foreground">You're focused and ready. Clarity compounds.</p>
          <Button variant="outline" size="sm" onClick={() => setDailyComplete(false)}>Review Again</Button>
        </div>
      )}

      {/* ═══════════════ WEEKLY REVIEW ═══════════════ */}
      {tab === "weekly" && !weeklyComplete && (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {weeklyKpis.map((k) => (
              <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Wins This Week */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Wins This Week</h2>
            </div>
            <div className="space-y-2">
              {MOCK_WINS.map((w, i) => (
                <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--brain-teal))] shrink-0" />
                  <p className="text-sm">{w}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What's Stuck */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What's Stuck?</h2>
            </div>
            {staleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing stuck — strong week.</p>
            ) : (
              <div className="space-y-2">
                {staleItems.slice(0, 4).map((c) => (
                  <div key={c.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[hsl(var(--brain-amber))] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                      <p className="text-[10px] text-muted-foreground">Unprocessed for {Math.round((Date.now() - new Date(c.created_at).getTime()) / 86400000)}d</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Project Momentum */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Momentum</h2>
            </div>
            <div className="space-y-2">
              {projectMomentum.map((p) => (
                <div key={p.name} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[hsl(var(--brain-teal))] font-medium">{p.movement}</span>
                      <Badge variant={p.risk === "on_track" ? "default" : "secondary"} className={`text-[9px] ${riskColor(p.risk)}`}>
                        {p.risk === "on_track" ? "On Track" : "At Risk"}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Next: {p.milestone}</p>
                </div>
              ))}
            </div>
          </section>

          {/* AI Weekly Recommendations */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Weekly Recommendations</h2>
            </div>
            <div className="space-y-2">
              {weeklyRecs.map((r, i) => (
                <div key={i} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{r.text}</p>
                    <p className="text-[10px] text-muted-foreground italic">{r.why}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs gap-1 shrink-0" onClick={() => navigate(r.dest)}>
                    {r.action} <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Plan Next Week */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plan Next Week</h2>
            </div>
            <div className="rounded-xl border bg-card p-5 space-y-3">
              {[
                { label: "Top 3 priorities", hint: "What must get done?" },
                { label: "1 project to push hard", hint: "Where will you create momentum?" },
                { label: "1 idea to explore", hint: "What deserves creative time?" },
                { label: "1 task to defer or delegate", hint: "What can wait?" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground text-xs ml-2">— {item.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Inbox", to: "/inbox", icon: Inbox },
              { label: "Today", to: "/today", icon: CalendarCheck },
              { label: "AI Review", to: "/ai-review", icon: BrainCircuit },
              { label: "Projects", to: "/projects", icon: FolderKanban },
              { label: "Ideas Vault", to: "/ideas", icon: Lightbulb },
            ].map((l) => (
              <Button key={l.to} size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate(l.to)}>
                <l.icon className="h-3 w-3" /> {l.label}
              </Button>
            ))}
          </div>

          {/* Complete Weekly Review */}
          <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => setWeeklyComplete(true)}>
            <CalendarRange className="h-5 w-5" /> Complete Weekly Review
          </Button>
        </div>
      )}

      {tab === "weekly" && weeklyComplete && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <Trophy className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Weekly Review Complete</h3>
          <p className="text-sm text-muted-foreground">You've reset and planned. Clarity compounds.</p>
          <Button variant="outline" size="sm" onClick={() => setWeeklyComplete(false)}>Review Again</Button>
        </div>
      )}

      {/* Review Streak */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[hsl(var(--brain-rose))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consistency</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold text-primary">{MOCK_STREAK.dailyStreak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-sm font-bold">{MOCK_STREAK.lastWeekly}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Weekly</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{MOCK_STREAK.monthTotal}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Month</p>
          </div>
        </div>
      </section>
    </div>
  );
}
