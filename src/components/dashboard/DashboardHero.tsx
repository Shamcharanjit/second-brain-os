import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { CalendarCheck, RotateCcw, FolderKanban, Brain, CheckCircle2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { formatDistanceToNow, isToday, differenceInDays } from "date-fns";

export default function DashboardHero() {
  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { memories } = useMemory();
  const { last_daily_review_at, last_weekly_review_at } = useReviewMeta();
  const navigate = useNavigate();

  const dailyDone = !!(last_daily_review_at && isToday(new Date(last_daily_review_at)));

  const briefing = useMemo(() => {
    const lines: string[] = [];
    const todayCount = captures.filter((c) => c.status === "sent_to_today" && !c.is_completed).length;
    const stalled = projects.filter((p) => p.status !== "completed" && p.status !== "archived" && getProjectHealth(p) === "stalled").length;
    const atRisk = projects.filter((p) => p.status !== "completed" && p.status !== "archived" && getProjectHealth(p) === "at_risk").length;
    const unreviewed = memories.filter((m) => !m.is_archived && !m.last_reviewed_at).length;
    const inbox = captures.filter((c) => c.review_status !== "reviewed" && c.status !== "archived").length;

    if (todayCount === 0) lines.push("Today is empty — pick a focus");
    else if (todayCount <= 3) lines.push("Your focus is clear today");
    else lines.push(`${todayCount} items on your plate today`);

    if (stalled > 0) lines.push(`${stalled} project${stalled > 1 ? "s" : ""} stalled`);
    if (atRisk > 0) lines.push(`${atRisk} project${atRisk > 1 ? "s" : ""} at risk`);
    if (unreviewed > 3) lines.push(`${unreviewed} memories unreviewed`);
    if (inbox > 0) lines.push(`${inbox} item${inbox > 1 ? "s" : ""} in inbox`);
    if (last_weekly_review_at) lines.push(`Last review ${formatDistanceToNow(new Date(last_weekly_review_at), { addSuffix: true })}`);

    return lines.slice(0, 3);
  }, [captures, projects, memories, getProjectHealth, last_daily_review_at, last_weekly_review_at]);

  const weeklyOverdue = !last_weekly_review_at || differenceInDays(new Date(), new Date(last_weekly_review_at)) >= 7;

  return (
    <section className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}</h1>
        <div className="space-y-0.5">
          {briefing.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground">{line}</p>
          ))}
        </div>
      </div>

      {/* Review status chip */}
      <div className="flex items-center gap-3">
        {dailyDone ? (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Daily review complete</span>
          </div>
        ) : (
          <button
            onClick={() => navigate("/review")}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1 transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Daily review pending</span>
          </button>
        )}
        {weeklyOverdue && (
          <button
            onClick={() => navigate("/review")}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1 transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Weekly review due</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/today")}><CalendarCheck className="h-3.5 w-3.5" />Open Today</Button>
        <Button size="sm" variant={dailyDone ? "outline" : "default"} className="text-xs gap-1.5" onClick={() => navigate("/review")}><RotateCcw className="h-3.5 w-3.5" />{dailyDone ? "Review Again" : "Start Review"}</Button>
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/projects")}><FolderKanban className="h-3.5 w-3.5" />Projects</Button>
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/memory")}><Brain className="h-3.5 w-3.5" />Memory</Button>
      </div>
    </section>
  );
}
