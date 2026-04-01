import { Project } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban, Sparkles, CheckCircle2, AlertTriangle, Zap, TrendingUp,
} from "lucide-react";

interface Props {
  projects: Project[];
}

export default function ReviewStepProjects({ projects }: Props) {
  const atRisk = projects.filter((p) => p.status === "at_risk" || p.status === "blocked");
  const stalled = projects.filter((p) => {
    const hrs = (Date.now() - new Date(p.lastUpdated).getTime()) / 3600000;
    return hrs > 72 && p.status !== "completed";
  });

  return (
    <div className="space-y-4">
      {(atRisk.length > 0 || stalled.length > 0) && (
        <div className="rounded-lg bg-[hsl(var(--brain-rose))/0.08] border border-[hsl(var(--brain-rose))/0.15] p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--brain-rose))] shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {atRisk.length > 0 && <><span className="font-semibold text-foreground">{atRisk.length} project{atRisk.length > 1 ? "s" : ""} at risk</span>. </>}
            {stalled.length > 0 && <><span className="font-semibold text-foreground">{stalled.length} stalled</span> with no recent activity.</>}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {projects.filter((p) => p.status !== "completed").map((p) => {
          const isRisk = p.status === "at_risk" || p.status === "blocked";
          const isStale = (Date.now() - new Date(p.lastUpdated).getTime()) / 3600000 > 72;

          return (
            <div key={p.id} className={`rounded-xl border bg-card p-4 space-y-3 ${isRisk ? "border-[hsl(var(--brain-rose))/0.3]" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" style={{ color: `hsl(var(${p.color}))` }} />
                  <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isStale && <Badge variant="outline" className="text-[9px] text-[hsl(var(--brain-amber))] gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Stale</Badge>}
                  <Badge variant={isRisk ? "destructive" : "secondary"} className="text-[9px]">
                    {p.status === "on_track" ? "On Track" : p.status === "at_risk" ? "At Risk" : p.status === "planning" ? "Planning" : p.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Next: {p.nextMilestone}
                </span>
                <span className={`font-medium uppercase tracking-wider text-[10px] ${p.priority === "critical" ? "text-[hsl(var(--brain-rose))]" : p.priority === "high" ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
                  {p.priority}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
