import { useProjects } from "@/context/ProjectContext";
import { Project, ProjectHealth } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban, Sparkles, CheckCircle2, AlertTriangle, Zap, Heart, PauseCircle,
} from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const HEALTH_LABEL: Record<ProjectHealth, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "text-[hsl(var(--brain-teal))]" },
  at_risk: { label: "At Risk", className: "text-[hsl(var(--brain-amber))]" },
  stalled: { label: "Stalled", className: "text-[hsl(var(--brain-rose))]" },
};

export default function ReviewStepProjects() {
  const { projects, getProjectHealth } = useProjects();
  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "archived");

  const withHealth = activeProjects.map((p) => ({ ...p, health: getProjectHealth(p) }));
  const atRisk = withHealth.filter((p) => p.health === "at_risk" || p.health === "stalled");
  const noAction = withHealth.filter((p) => !p.next_actions.some((a) => !a.is_completed));

  if (activeProjects.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-medium">No active projects.</p>
        <p className="text-xs text-muted-foreground">Create a project to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(atRisk.length > 0 || noAction.length > 0) && (
        <div className="rounded-lg bg-[hsl(var(--brain-rose))/0.08] border border-[hsl(var(--brain-rose))/0.15] p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--brain-rose))] shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {atRisk.length > 0 && <><span className="font-semibold text-foreground">{atRisk.length} project{atRisk.length > 1 ? "s" : ""} need attention</span>. </>}
            {noAction.length > 0 && <><span className="font-semibold text-foreground">{noAction.length} have no next action</span> — add one to maintain momentum.</>}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {withHealth.map((p) => {
          const hlth = HEALTH_LABEL[p.health];
          const primaryAction = p.next_actions.find((a) => a.is_primary && !a.is_completed);

          return (
            <div key={p.id} className={`rounded-xl border bg-card p-4 space-y-3 ${p.health !== "healthy" ? "border-[hsl(var(--brain-rose))/0.3]" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" style={{ color: `hsl(var(${p.color}))` }} />
                  <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[9px] gap-0.5 ${hlth.className} border-transparent`}>
                    {p.health === "healthy" ? <Heart className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                    {hlth.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] capitalize">{p.status === "on_hold" ? "On Hold" : p.status}</Badge>
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
                {primaryAction ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" /> Next: {primaryAction.text}
                  </span>
                ) : (
                  <span className="text-[hsl(var(--brain-rose))] flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3" /> No next action
                  </span>
                )}
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
