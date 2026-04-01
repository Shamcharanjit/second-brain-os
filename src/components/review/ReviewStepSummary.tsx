import { Button } from "@/components/ui/button";
import {
  Trophy, Inbox, CalendarCheck, FolderKanban, Lightbulb, Brain, ArrowRight, Sparkles,
} from "lucide-react";

interface HealthData {
  inboxCount: number;
  unfinishedToday: number;
  atRiskProjects: number;
  newIdeas: number;
  notesCount: number;
  completedThisWeek: number;
}

interface Props {
  health: HealthData;
  stepsCompleted: number;
  totalSteps: number;
  onComplete: () => void;
}

export default function ReviewStepSummary({ health, stepsCompleted, totalSteps, onComplete }: Props) {
  const allGood = health.inboxCount === 0 && health.unfinishedToday === 0 && health.atRiskProjects === 0;

  const insights: string[] = [];
  if (health.inboxCount > 3) insights.push(`${health.inboxCount} inbox items still need decisions — schedule 10 minutes to clear them.`);
  if (health.unfinishedToday > 0) insights.push(`${health.unfinishedToday} unfinished Today items may need re-prioritization next week.`);
  if (health.atRiskProjects > 0) insights.push(`${health.atRiskProjects} project${health.atRiskProjects > 1 ? "s" : ""} at risk — define clear next actions.`);
  if (health.newIdeas > 2) insights.push(`${health.newIdeas} unexplored ideas — block time to evaluate the strongest ones.`);
  if (health.completedThisWeek > 3) insights.push(`Great momentum: ${health.completedThisWeek} items completed this week.`);

  const healthItems = [
    { label: "Inbox Queue", value: health.inboxCount, icon: Inbox, color: health.inboxCount > 3 ? "text-[hsl(var(--brain-amber))]" : "text-[hsl(var(--brain-teal))]" },
    { label: "Unfinished Today", value: health.unfinishedToday, icon: CalendarCheck, color: health.unfinishedToday > 2 ? "text-[hsl(var(--brain-rose))]" : "text-[hsl(var(--brain-teal))]" },
    { label: "At-Risk Projects", value: health.atRiskProjects, icon: FolderKanban, color: health.atRiskProjects > 0 ? "text-[hsl(var(--brain-rose))]" : "text-[hsl(var(--brain-teal))]" },
    { label: "New Ideas", value: health.newIdeas, icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]" },
    { label: "Knowledge Notes", value: health.notesCount, icon: Brain, color: "text-primary" },
    { label: "Completed", value: health.completedThisWeek, icon: Trophy, color: "text-[hsl(var(--brain-teal))]" },
  ];

  return (
    <div className="space-y-6">
      {/* System Health */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {healthItems.map((h) => (
          <div key={h.label} className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <h.icon className={`h-4 w-4 ${h.color}`} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{h.label}</span>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${h.color}`}>{h.value}</p>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus Recommendations for Next Week</span>
          </div>
          <div className="space-y-1.5">
            {insights.map((text, i) => (
              <div key={i} className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allGood && (
        <div className="rounded-xl border bg-card p-6 text-center space-y-2">
          <Trophy className="h-10 w-10 text-[hsl(var(--brain-teal))] mx-auto" />
          <p className="text-sm font-semibold">System is healthy!</p>
          <p className="text-xs text-muted-foreground">You're on top of everything. Keep the momentum.</p>
        </div>
      )}

      <Button className="w-full h-12 text-base font-semibold gap-2" onClick={onComplete}>
        <Trophy className="h-5 w-5" /> Complete Weekly Review
      </Button>
    </div>
  );
}
