import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { AlertTriangle, ArrowRight, Inbox, FolderKanban, Brain, CalendarCheck, Lightbulb, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface Alert {
  id: string;
  label: string;
  reason: string;
  icon: React.ElementType;
  color: string;
  action: string;
  route: string;
}

export default function DashboardAlerts() {
  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { memories } = useMemory();
  const { last_weekly_review_at } = useReviewMeta();
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const list: Alert[] = [];

    // Today empty
    const todayCount = captures.filter((c) => c.status === "sent_to_today" && !c.is_completed).length;
    if (todayCount === 0) {
      list.push({ id: "empty-today", label: "Today is empty", reason: "Pick a focus to start your day", icon: CalendarCheck, color: "text-[hsl(var(--brain-teal))]", action: "Open Inbox", route: "/inbox" });
    }

    // Inbox backlog
    const inbox = captures.filter((c) => c.review_status !== "reviewed" && c.status !== "archived").length;
    if (inbox > 5) {
      list.push({ id: "inbox-backlog", label: `${inbox} items in inbox`, reason: "Review and route your captures", icon: Inbox, color: "text-[hsl(var(--brain-amber))]", action: "Review", route: "/inbox" });
    }

    // Stalled projects
    const stalled = projects.filter((p) => p.status !== "completed" && p.status !== "archived" && getProjectHealth(p) === "stalled");
    stalled.forEach((p) => {
      list.push({ id: `stalled-${p.id}`, label: `${p.name} is stalled`, reason: "No activity or next action", icon: FolderKanban, color: "text-[hsl(var(--brain-rose))]", action: "Review", route: "/projects" });
    });

    // Projects missing next action
    const noAction = projects.filter((p) => (p.status === "active" || p.status === "planning") && !p.next_actions.some((a) => !a.is_completed));
    noAction.forEach((p) => {
      if (!stalled.find((s) => s.id === p.id)) {
        list.push({ id: `noaction-${p.id}`, label: `${p.name} needs a next step`, reason: "Add a next action to maintain momentum", icon: AlertTriangle, color: "text-[hsl(var(--brain-amber))]", action: "Open", route: "/projects" });
      }
    });

    // Unreviewed memories
    const unreviewed = memories.filter((m) => !m.is_archived && !m.last_reviewed_at && m.importance_score >= 60).length;
    if (unreviewed > 2) {
      list.push({ id: "unreviewed-mem", label: `${unreviewed} important memories unreviewed`, reason: "Review your knowledge to keep it useful", icon: Brain, color: "text-primary", action: "Review", route: "/memory" });
    }

    // High-priority unconverted ideas
    const unconverted = captures.filter((c) => c.status === "sent_to_ideas" && c.idea_status !== "converted_to_project" && c.idea_status !== "archived" && (c.ai_data?.priority_score ?? 0) >= 70).length;
    if (unconverted > 1) {
      list.push({ id: "ideas-convert", label: `${unconverted} high-priority ideas waiting`, reason: "Consider converting to projects", icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]", action: "Review", route: "/ideas" });
    }

    // Weekly review overdue
    const weeklyOverdue = !last_weekly_review_at || (Date.now() - new Date(last_weekly_review_at).getTime()) > 7 * 86400000;
    if (weeklyOverdue) {
      list.push({ id: "weekly-review", label: "Weekly Review recommended", reason: last_weekly_review_at ? `Last completed ${new Date(last_weekly_review_at).toLocaleDateString()}` : "You haven't done one yet", icon: CalendarRange, color: "text-primary", action: "Start", route: "/review" });
    }

    return list.slice(0, 5);
  }, [captures, projects, memories, getProjectHealth, last_weekly_review_at]);

  if (alerts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</h2>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-lg border bg-card p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(a.route)}>
            <a.icon className={`h-4 w-4 ${a.color} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.reason}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-xs gap-1 shrink-0">{a.action} <ArrowRight className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}
