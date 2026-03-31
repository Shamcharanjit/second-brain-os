import { useMemo, useState } from "react";
import {
  FolderKanban, AlertTriangle, CalendarClock, RefreshCw, ChevronRight,
  Target, Zap, Lightbulb, Plus, ArrowRight, CheckCircle2, Circle,
  ShieldCheck, Clock, X,
} from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { MOCK_PROJECTS } from "@/lib/mock-projects";
import { Project, ProjectStatus } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CaptureCard from "@/components/CaptureCard";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string; icon: React.ElementType }> = {
  on_track: { label: "On Track", className: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]", icon: ShieldCheck },
  at_risk: { label: "At Risk", className: "bg-[hsl(var(--brain-rose))/0.12] text-[hsl(var(--brain-rose))]", icon: AlertTriangle },
  planning: { label: "Planning", className: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]", icon: Target },
  blocked: { label: "Blocked", className: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary", icon: CheckCircle2 },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-[hsl(var(--brain-rose))]",
  high: "text-[hsl(var(--brain-amber))]",
  medium: "text-muted-foreground",
  low: "text-muted-foreground/60",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProjectsPage() {
  const { captures } = useBrain();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Link captures to projects via suggested_project
  const projectCaptures = useMemo(() => {
    const map: Record<string, typeof captures> = {};
    for (const c of captures) {
      const proj = c.ai_data?.suggested_project;
      if (proj) {
        if (!map[proj]) map[proj] = [];
        map[proj].push(c);
      }
    }
    return map;
  }, [captures]);

  const getLinkedTasks = (name: string) =>
    (projectCaptures[name] || []).filter(
      (c) => c.ai_data?.category === "task" || c.ai_data?.category === "reminder" || c.ai_data?.category === "follow_up"
    );
  const getLinkedIdeas = (name: string) =>
    (projectCaptures[name] || []).filter(
      (c) => c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later"
    );

  const stats = useMemo(() => ({
    active: MOCK_PROJECTS.filter((p) => p.status !== "completed").length,
    atRisk: MOCK_PROJECTS.filter((p) => p.status === "at_risk" || p.status === "blocked").length,
    thisWeek: MOCK_PROJECTS.filter((p) => {
      const hrs = (Date.now() - new Date(p.lastUpdated).getTime()) / 3600000;
      return hrs < 168 && p.priority !== "low";
    }).length,
    recentlyUpdated: MOCK_PROJECTS.filter((p) => {
      const hrs = (Date.now() - new Date(p.lastUpdated).getTime()) / 3600000;
      return hrs < 24;
    }).length,
  }), []);

  const priorityProjects = useMemo(
    () => MOCK_PROJECTS.filter((p) => p.status !== "completed").sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    }).slice(0, 4),
    []
  );

  const kpiCards = [
    { label: "Active Projects", value: stats.active, icon: FolderKanban, color: "text-primary" },
    { label: "At Risk", value: stats.atRisk, icon: AlertTriangle, color: "text-[hsl(var(--brain-rose))]" },
    { label: "This Week Focus", value: stats.thisWeek, icon: CalendarClock, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Recently Updated", value: stats.recentlyUpdated, icon: RefreshCw, color: "text-[hsl(var(--brain-blue))]" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track active workstreams, key initiatives, and longer-term outcomes.
        </p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Priority Projects */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Priority Projects</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {priorityProjects.map((project) => {
            const tasks = getLinkedTasks(project.name);
            const ideas = getLinkedIdeas(project.name);
            const statusCfg = STATUS_CONFIG[project.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={project.id}
                className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ background: `hsl(var(${project.color}) / 0.12)` }}
                    >
                      <FolderKanban className="h-5 w-5" style={{ color: `hsl(var(${project.color}))` }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{project.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.className} border-transparent`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{tasks.length} tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lightbulb className="h-3 w-3" />
                    <span>{ideas.length} ideas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{timeAgo(project.lastUpdated)}</span>
                  </div>
                </div>

                {/* Priority + Next milestone */}
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold uppercase tracking-wider ${PRIORITY_COLORS[project.priority]}`}>
                    {project.priority} priority
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Next: {project.nextMilestone}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}>
                    Open <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* All Projects */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Projects</h2>
        </div>
        <div className="space-y-2">
          {MOCK_PROJECTS.map((project) => {
            const tasks = getLinkedTasks(project.name);
            const ideas = getLinkedIdeas(project.name);
            const statusCfg = STATUS_CONFIG[project.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={project.id}
                className="rounded-xl border bg-card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(${project.color}) / 0.12)` }}
                >
                  <FolderKanban className="h-4 w-4" style={{ color: `hsl(var(${project.color}))` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                    <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.className} border-transparent shrink-0`}>
                      <StatusIcon className="h-2.5 w-2.5" />{statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span>{tasks.length} tasks</span>
                  <span>{ideas.length} ideas</span>
                  <span>{project.progress}%</span>
                  <span>{timeAgo(project.lastUpdated)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(o) => !o && setSelectedProject(null)}>
        {selectedProject && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(var(${selectedProject.color}) / 0.12)` }}
                >
                  <FolderKanban className="h-5 w-5" style={{ color: `hsl(var(${selectedProject.color}))` }} />
                </div>
                <div>
                  <DialogTitle className="text-lg">{selectedProject.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{selectedProject.description}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Overview row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center space-y-1">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${STATUS_CONFIG[selectedProject.status].className} border-transparent`}>
                      {STATUS_CONFIG[selectedProject.status].label}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center space-y-1">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <p className={`text-sm font-semibold capitalize ${PRIORITY_COLORS[selectedProject.priority]}`}>{selectedProject.priority}</p>
                </div>
                <div className="rounded-lg border p-3 text-center space-y-1">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <p className="text-sm font-semibold">{selectedProject.progress}%</p>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones</h3>
                <div className="space-y-1.5">
                  {selectedProject.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {m.done ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Tasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Linked Tasks ({getLinkedTasks(selectedProject.name).length})
                </h3>
                {getLinkedTasks(selectedProject.name).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No tasks linked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getLinkedTasks(selectedProject.name).slice(0, 5).map((c) => (
                      <CaptureCard key={c.id} capture={c} />
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Ideas */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Linked Ideas ({getLinkedIdeas(selectedProject.name).length})
                </h3>
                {getLinkedIdeas(selectedProject.name).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No ideas linked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getLinkedIdeas(selectedProject.name).slice(0, 5).map((c) => (
                      <CaptureCard key={c.id} capture={c} />
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Last updated {timeAgo(selectedProject.lastUpdated)} · Next milestone: {selectedProject.nextMilestone}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
