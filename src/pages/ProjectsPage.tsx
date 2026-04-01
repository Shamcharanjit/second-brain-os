import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, AlertTriangle, CalendarClock, RefreshCw, ChevronRight,
  Target, Zap, Lightbulb, Plus, CheckCircle2, Clock, ShieldCheck, PauseCircle,
  Search, Heart, Shield, X,
} from "lucide-react";
import { useProjects } from "@/context/ProjectContext";
import { useBrain } from "@/context/BrainContext";
import { Project, ProjectStatus, ProjectHealth } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ProjectDetailPanel from "@/components/projects/ProjectDetailPanel";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: "Active", className: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]", icon: ShieldCheck },
  planning: { label: "Planning", className: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]", icon: Target },
  on_hold: { label: "On Hold", className: "bg-[hsl(var(--brain-amber))/0.12] text-[hsl(var(--brain-amber))]", icon: PauseCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary", icon: CheckCircle2 },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground", icon: X },
};

const HEALTH_CONFIG: Record<ProjectHealth, { label: string; className: string; icon: React.ElementType }> = {
  healthy: { label: "Healthy", className: "text-[hsl(var(--brain-teal))]", icon: Heart },
  at_risk: { label: "At Risk", className: "text-[hsl(var(--brain-amber))]", icon: AlertTriangle },
  stalled: { label: "Stalled", className: "text-[hsl(var(--brain-rose))]", icon: AlertTriangle },
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

type FilterTab = "all" | "active" | "priority" | "stalled" | "completed";

export default function ProjectsPage() {
  const { projects, getProjectHealth } = useProjects();
  const { captures } = useBrain();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const projectsWithHealth = useMemo(() =>
    projects.map((p) => ({ ...p, health: getProjectHealth(p) })),
    [projects, getProjectHealth]
  );

  const linkedCaptureCount = (p: Project) => {
    let count = p.linked_capture_ids.length;
    for (const c of captures) {
      if (c.ai_data?.suggested_project === p.name && !p.linked_capture_ids.includes(c.id)) count++;
    }
    return count;
  };

  const linkedIdeaCount = (p: Project) =>
    captures.filter((c) =>
      (c.ai_data?.suggested_project === p.name || p.linked_capture_ids.includes(c.id)) &&
      (c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later")
    ).length;

  const stats = useMemo(() => ({
    active: projectsWithHealth.filter((p) => p.status === "active" || p.status === "planning").length,
    priority: projectsWithHealth.filter((p) => (p.priority === "critical" || p.priority === "high") && p.status !== "completed" && p.status !== "archived").length,
    stalled: projectsWithHealth.filter((p) => p.health === "stalled" || p.health === "at_risk").length,
    completed: projectsWithHealth.filter((p) => p.status === "completed").length,
  }), [projectsWithHealth]);

  const filtered = useMemo(() => {
    let list = projectsWithHealth;
    if (filter === "active") list = list.filter((p) => p.status === "active" || p.status === "planning");
    else if (filter === "priority") list = list.filter((p) => (p.priority === "critical" || p.priority === "high") && p.status !== "completed" && p.status !== "archived");
    else if (filter === "stalled") list = list.filter((p) => p.health === "stalled" || p.health === "at_risk");
    else if (filter === "completed") list = list.filter((p) => p.status === "completed");
    else list = list.filter((p) => p.status !== "archived");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return list.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
  }, [projectsWithHealth, filter, search]);

  const kpiCards = [
    { label: "Active", value: stats.active, icon: FolderKanban, color: "text-primary" },
    { label: "Priority", value: stats.priority, icon: Target, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Needs Attention", value: stats.stalled, icon: AlertTriangle, color: "text-[hsl(var(--brain-rose))]" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-[hsl(var(--brain-teal))]" },
  ];

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: projectsWithHealth.filter((p) => p.status !== "archived").length },
    { key: "active", label: "Active", count: stats.active },
    { key: "priority", label: "Priority", count: stats.priority },
    { key: "stalled", label: "Needs Attention", count: stats.stalled },
    { key: "completed", label: "Completed", count: stats.completed },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Track momentum, next actions, and strategic initiatives.</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* KPI */}
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

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all shrink-0 ${
                filter === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-8 h-8 text-xs w-full sm:w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium">No projects match your filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((project) => {
            const statusCfg = STATUS_CONFIG[project.status];
            const StatusIcon = statusCfg.icon;
            const healthCfg = HEALTH_CONFIG[project.health];
            const HealthIcon = healthCfg.icon;
            const primaryAction = project.next_actions.find((a) => a.is_primary && !a.is_completed);
            const tasks = linkedCaptureCount(project);
            const ideas = linkedIdeaCount(project);

            return (
              <div
                key={project.id}
                className={`rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow cursor-pointer ${
                  project.health === "stalled" ? "border-[hsl(var(--brain-rose))/0.3]" : project.health === "at_risk" ? "border-[hsl(var(--brain-amber))/0.2]" : ""
                }`}
                onClick={() => setSelectedId(project.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(${project.color}) / 0.12)` }}>
                      <FolderKanban className="h-5 w-5" style={{ color: `hsl(var(${project.color}))` }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{project.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] gap-0.5 ${healthCfg.className} border-transparent`}>
                      <HealthIcon className="h-2.5 w-2.5" /> {healthCfg.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] gap-0.5 ${statusCfg.className} border-transparent`}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>

                {primaryAction ? (
                  <div className="flex items-center gap-2 text-xs rounded-lg bg-primary/5 border border-primary/10 p-2">
                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate"><span className="font-medium text-foreground">Next:</span> {primaryAction.text}</span>
                  </div>
                ) : project.status !== "completed" ? (
                  <div className="flex items-center gap-2 text-xs rounded-lg bg-[hsl(var(--brain-rose))/0.08] border border-[hsl(var(--brain-rose))/0.15] p-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--brain-rose))] shrink-0" />
                    <span className="text-[hsl(var(--brain-rose))] font-medium">No next action defined</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{tasks} tasks</span>
                    <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" />{ideas} ideas</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(project.last_updated)}</span>
                  </div>
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${PRIORITY_COLORS[project.priority]}`}>
                    {project.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Detail */}
      {selectedId && (
        <ProjectDetailPanel projectId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Create Project */}
      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
