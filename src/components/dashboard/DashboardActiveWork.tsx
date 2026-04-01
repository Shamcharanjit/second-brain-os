import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { CalendarCheck, FolderKanban, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CaptureCard from "@/components/CaptureCard";
import { useMemo } from "react";

export default function DashboardActiveWork() {
  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const navigate = useNavigate();

  const todayItems = useMemo(() =>
    captures.filter((c) => c.status === "sent_to_today" && !c.is_completed)
      .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0)).slice(0, 3),
    [captures]);

  const troubledProjects = useMemo(() =>
    projects.filter((p) => p.status !== "completed" && p.status !== "archived")
      .map((p) => ({ ...p, health: getProjectHealth(p) }))
      .filter((p) => p.health === "stalled" || p.health === "at_risk")
      .slice(0, 3),
    [projects, getProjectHealth]);

  const noActionProjects = useMemo(() =>
    projects.filter((p) => (p.status === "active" || p.status === "planning") && !p.next_actions.some((a) => !a.is_completed))
      .slice(0, 3),
    [projects]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Today */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today Focus</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/today")}>View All <ArrowRight className="h-3 w-3" /></Button>
        </div>
        {todayItems.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brain-teal))] mx-auto" />
            <p className="text-sm text-muted-foreground">No tasks for today yet</p>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/inbox")}>Review Inbox</Button>
          </div>
        ) : (
          <div className="space-y-2">{todayItems.map((c) => <CaptureCard key={c.id} capture={c} />)}</div>
        )}
      </section>

      {/* Projects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[hsl(var(--brain-blue))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Projects</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/projects")}>View All <ArrowRight className="h-3 w-3" /></Button>
        </div>
        <div className="space-y-2">
          {troubledProjects.length > 0 && troubledProjects.map((p) => (
            <div key={p.id} className="rounded-lg border border-[hsl(var(--brain-rose))/0.2] bg-[hsl(var(--brain-rose))/0.04] p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/projects")}>
              <AlertTriangle className={`h-4 w-4 shrink-0 ${p.health === "stalled" ? "text-[hsl(var(--brain-rose))]" : "text-[hsl(var(--brain-amber))]"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{p.health.replace("_", " ")} · {p.priority} priority</p>
              </div>
            </div>
          ))}
          {noActionProjects.length > 0 && noActionProjects.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/projects")}>
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--brain-amber))] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">Needs a next action</p>
              </div>
            </div>
          ))}
          {troubledProjects.length === 0 && noActionProjects.length === 0 && (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">All projects on track</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
