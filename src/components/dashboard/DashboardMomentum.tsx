import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { TrendingUp, CheckCircle2, Inbox, Brain, Lightbulb } from "lucide-react";
import { useMemo } from "react";

export default function DashboardMomentum() {
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const completedThisWeek = captures.filter((c) => c.is_completed && c.completed_at && new Date(c.completed_at).getTime() > weekAgo).length;
    const capturedThisWeek = captures.filter((c) => new Date(c.created_at).getTime() > weekAgo).length;
    const processedThisWeek = captures.filter((c) => c.review_status === "reviewed" && new Date(c.created_at).getTime() > weekAgo).length;
    const memoriesThisWeek = memories.filter((m) => new Date(m.created_at).getTime() > weekAgo).length;
    const ideasConverted = captures.filter((c) => c.idea_status === "converted_to_project" && c.converted_to_project_at && new Date(c.converted_to_project_at).getTime() > weekAgo).length;
    return { completedThisWeek, capturedThisWeek, processedThisWeek, memoriesThisWeek, ideasConverted };
  }, [captures, memories]);

  const items = [
    { label: "Tasks Completed", value: stats.completedThisWeek, icon: CheckCircle2, color: "text-[hsl(var(--brain-teal))]", to: "/today" },
    { label: "Captures Processed", value: stats.processedThisWeek, icon: Inbox, color: "text-[hsl(var(--brain-amber))]", to: "/inbox" },
    { label: "Knowledge Saved", value: stats.memoriesThisWeek, icon: Brain, color: "text-primary", to: "/memory" },
    { label: "Ideas → Projects", value: stats.ideasConverted, icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]", to: "/ideas" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Week</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border bg-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all"
            onClick={() => navigate(item.to)}
          >
            <item.icon className={`h-5 w-5 ${item.color} shrink-0`} />
            <div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
