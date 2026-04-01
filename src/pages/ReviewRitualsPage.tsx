import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun, CalendarRange, Inbox, CalendarCheck, BrainCircuit,
  Lightbulb, FolderKanban, ArrowRight, Sparkles, Trash2, CheckCircle2,
  AlertTriangle, Target, Flame, Zap, Clock, RotateCcw,
  Trophy, Archive, ChevronRight, ChevronLeft, Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useIntegrationActions } from "@/hooks/useIntegrationActions";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { toast } from "sonner";
import ReviewStepInbox from "@/components/review/ReviewStepInbox";
import ReviewStepToday from "@/components/review/ReviewStepToday";
import ReviewStepProjects from "@/components/review/ReviewStepProjects";
import ReviewStepIdeas from "@/components/review/ReviewStepIdeas";
import ReviewStepMemory from "@/components/review/ReviewStepMemory";
import ReviewStepSummary from "@/components/review/ReviewStepSummary";

type ReviewTab = "daily" | "weekly";

const MOCK_STREAK = { dailyStreak: 5, lastWeekly: "3 days ago", monthTotal: 18 }; // fallback only

const WEEKLY_STEPS = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "today", label: "Today", icon: CalendarCheck },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "ideas", label: "Ideas", icon: Lightbulb },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "summary", label: "Summary", icon: Trophy },
] as const;

type WeeklyStep = typeof WEEKLY_STEPS[number]["key"];

export default function ReviewRitualsPage() {
  const {
    captures, approveCapture, routeCapture, archiveCapture,
    completeCapture, updateIdeaStatus, convertIdeaToProject,
  } = useBrain();
  const { routeToMemory } = useIntegrationActions();
  const { markDailyComplete: persistDaily, markWeeklyComplete: persistWeekly, dailyStreak, lastWeeklyLabel, monthTotal } = useReviewMeta();
  const { projects, getProjectHealth } = useProjects();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReviewTab>("weekly");
  const [dailyComplete, setDailyComplete] = useState(false);
  const [weeklyComplete, setWeeklyComplete] = useState(false);
  const [weeklyStep, setWeeklyStep] = useState<WeeklyStep>("inbox");
  const [completedSteps, setCompletedSteps] = useState<Set<WeeklyStep>>(new Set());

  const unprocessed = useMemo(() => captures.filter((c) => c.status === "unprocessed" || (c.review_status === "needs_review" && c.status !== "archived")), [captures]);
  const todayActive = useMemo(() => captures.filter((c) => c.status === "sent_to_today" && !c.is_completed), [captures]);
  const todayCompleted = useMemo(() => captures.filter((c) => c.status === "sent_to_today" && c.is_completed), [captures]);
  const pendingReview = useMemo(() => captures.filter((c) => c.review_status === "needs_review" && c.status === "unprocessed"), [captures]);
  const ideas = useMemo(() => captures.filter((c) =>
    (c.status === "sent_to_ideas" || c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later") &&
    c.status !== "archived" && c.idea_status !== "archived" && c.idea_status !== "converted_to_project"
  ), [captures]);
  const newIdeas = useMemo(() => ideas.filter((c) => c.idea_status === "new"), [ideas]);
  const highPotentialIdeas = useMemo(() => ideas.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65), [ideas]);
  const parkedIdeas = useMemo(() => ideas.filter((c) => c.idea_status === "parked"), [ideas]);
  
  const urgentItems = useMemo(() => captures.filter((c) =>
    c.status !== "archived" && c.ai_data?.urgency === "high"
  ).sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0)).slice(0, 5), [captures]);
  const staleItems = useMemo(() => captures.filter((c) =>
    c.status === "unprocessed" && (Date.now() - new Date(c.created_at).getTime()) > 3 * 86400000
  ), [captures]);

  const atRiskProjects = useMemo(() =>
    projects.filter((p) => p.status !== "completed" && p.status !== "archived" && (getProjectHealth(p) === "at_risk" || getProjectHealth(p) === "stalled")).length,
    [projects, getProjectHealth]
  );

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

  const currentStepIndex = WEEKLY_STEPS.findIndex((s) => s.key === weeklyStep);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < WEEKLY_STEPS.length - 1;

  const markStepAndAdvance = () => {
    setCompletedSteps((prev) => new Set([...prev, weeklyStep]));
    if (canGoForward) setWeeklyStep(WEEKLY_STEPS[currentStepIndex + 1].key);
  };

  const dailyKpis = [
    { label: "Unprocessed", value: unprocessed.length, icon: Inbox, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Today's Priorities", value: todayActive.length, icon: CalendarCheck, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Pending Review", value: pendingReview.length, icon: BrainCircuit, color: "text-primary" },
    { label: "At Risk Projects", value: atRiskProjects, icon: AlertTriangle, color: "text-[hsl(var(--brain-rose))]" },
  ];

  const handleApproveInbox = (id: string) => { approveCapture(id); toast.success("Approved"); };
  const handleRouteToday = (id: string) => { routeCapture(id, "sent_to_today"); toast.success("Moved to Today"); };
  const handleRouteIdeas = (id: string) => { routeCapture(id, "sent_to_ideas"); toast.success("Moved to Ideas Vault"); };
  const handleRouteProjects = (id: string) => { routeCapture(id, "sent_to_projects"); toast.success("Moved to Projects"); };
  const handleArchive = (id: string) => { archiveCapture(id); toast("Archived"); };
  const handleRouteMemory = (id: string) => {
    const capture = captures.find((c) => c.id === id);
    if (capture) { routeToMemory(capture); toast.success("Saved to Memory"); }
  };
  const handleComplete = (id: string) => { completeCapture(id); toast.success("Completed"); };
  const handleDefer = (id: string) => { routeCapture(id, "unprocessed"); toast("Deferred to Inbox"); };
  const handleExplore = (id: string) => { updateIdeaStatus(id, "explored"); toast.success("Marked as Explored"); };
  const handleConvert = (id: string) => { convertIdeaToProject(id); toast.success("Converted to Project"); };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Rituals</h1>
        <p className="text-sm text-muted-foreground mt-1">Reset your system. Reclaim clarity. Choose what matters next.</p>
      </div>

      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-sm font-medium text-foreground italic">"Your best decisions come after review."</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">A few minutes of review saves hours of mental drag.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("daily")} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-all ${tab === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}>
          <Sun className="h-4 w-4" /> Daily Review
        </button>
        <button onClick={() => setTab("weekly")} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border transition-all ${tab === "weekly" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}>
          <CalendarRange className="h-4 w-4" /> Weekly Review
        </button>
      </div>

      {/* DAILY */}
      {tab === "daily" && !dailyComplete && (
        <div className="space-y-8">
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

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clear the Noise</h2>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-2">
              {staleItems.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{staleItems.length} stale capture{staleItems.length > 1 ? "s" : ""} to archive or decide</span>
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate("/inbox")}>Review <ArrowRight className="h-3 w-3" /></Button>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Convert loose notes into tasks or ideas</span>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate("/ai-review")}>AI Review <ArrowRight className="h-3 w-3" /></Button>
              </div>
            </div>
          </section>

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

          <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => { setDailyComplete(true); persistDaily(); toast.success("Daily review complete — clarity restored."); }}>
            <Sun className="h-5 w-5" /> Complete Daily Review
          </Button>
        </div>
      )}

      {tab === "daily" && dailyComplete && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Clarity Restored</h3>
          <p className="text-sm text-muted-foreground">Your system is back in sync. You're set for today.</p>
          {dailyStreak > 1 && (
            <p className="text-xs font-medium text-primary">{dailyStreak}-day review streak 🔥</p>
          )}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setDailyComplete(false)}>Review Again</Button>
            <Button size="sm" onClick={() => navigate("/")}>Back to Dashboard</Button>
          </div>
        </div>
      )}

      {/* WEEKLY */}
      {tab === "weekly" && !weeklyComplete && (
        <div className="space-y-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {WEEKLY_STEPS.map((step) => {
              const isActive = step.key === weeklyStep;
              const isDone = completedSteps.has(step.key);
              const StepIcon = step.icon;
              return (
                <button key={step.key} onClick={() => setWeeklyStep(step.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all shrink-0 ${
                    isActive ? "border-primary bg-primary/10 text-primary" : isDone ? "border-[hsl(var(--brain-teal))/0.3] bg-[hsl(var(--brain-teal))/0.08] text-[hsl(var(--brain-teal))]" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}>
                  {isDone && !isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                  {step.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{WEEKLY_STEPS[currentStepIndex].label} Review</h2>
              <span className="text-xs text-muted-foreground">Step {currentStepIndex + 1} of {WEEKLY_STEPS.length}</span>
            </div>

            {weeklyStep === "inbox" && (
              <ReviewStepInbox items={unprocessed} onApprove={handleApproveInbox} onRouteToday={handleRouteToday} onRouteIdeas={handleRouteIdeas} onRouteProjects={handleRouteProjects} onRouteMemory={handleRouteMemory} onArchive={handleArchive} />
            )}
            {weeklyStep === "today" && (
              <ReviewStepToday active={todayActive} completed={todayCompleted} onComplete={handleComplete} onDefer={handleDefer} onMoveToProjects={handleRouteProjects} onArchive={handleArchive} />
            )}
            {weeklyStep === "projects" && <ReviewStepProjects />}
            {weeklyStep === "ideas" && (
              <ReviewStepIdeas newIdeas={newIdeas} highPotential={highPotentialIdeas} parked={parkedIdeas} onExplore={handleExplore} onConvert={handleConvert} onPromote={handleRouteToday} onArchive={handleArchive} />
            )}
            {weeklyStep === "memory" && <ReviewStepMemory />}
            {weeklyStep === "summary" && (
              <ReviewStepSummary
                health={{ inboxCount: unprocessed.length, unfinishedToday: todayActive.length, atRiskProjects, newIdeas: newIdeas.length, notesCount: 0, completedThisWeek: todayCompleted.length }}
                stepsCompleted={completedSteps.size} totalSteps={WEEKLY_STEPS.length} onComplete={() => { setWeeklyComplete(true); persistWeekly(); toast.success("Weekly review complete — your system is reset."); }}
              />
            )}
          </div>

          {weeklyStep !== "summary" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" className="text-xs gap-1" disabled={!canGoBack} onClick={() => setWeeklyStep(WEEKLY_STEPS[currentStepIndex - 1].key)}>
                <ChevronLeft className="h-3 w-3" /> Back
              </Button>
              <Button size="sm" className="text-xs gap-1" onClick={markStepAndAdvance}>
                {canGoForward ? (<>Next: {WEEKLY_STEPS[currentStepIndex + 1].label} <ChevronRight className="h-3 w-3" /></>) : (<>View Summary <Trophy className="h-3 w-3" /></>)}
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "weekly" && weeklyComplete && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <Trophy className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Weekly Review Complete</h3>
          <p className="text-sm text-muted-foreground">You've reset and planned. Your second brain is in sync.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setWeeklyComplete(false); setCompletedSteps(new Set()); setWeeklyStep("inbox"); }}>Review Again</Button>
            <Button size="sm" onClick={() => navigate("/")}>Back to Dashboard</Button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[hsl(var(--brain-rose))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consistency</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold text-primary">{dailyStreak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-sm font-bold">{lastWeeklyLabel}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Weekly</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{monthTotal}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Month</p>
          </div>
        </div>
      </section>
    </div>
  );
}
