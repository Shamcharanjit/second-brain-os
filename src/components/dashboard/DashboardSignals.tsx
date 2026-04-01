import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { CalendarCheck, FolderKanban, AlertTriangle, Lightbulb, Brain, Inbox } from "lucide-react";
import { useMemo } from "react";

interface SignalCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

function SignalCard({ label, value, icon: Icon, color, sub }: SignalCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function DashboardSignals() {
  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { memories } = useMemory();

  const signals = useMemo(() => {
    const today = captures.filter((c) => c.status === "sent_to_today" && !c.is_completed).length;
    const active = projects.filter((p) => p.status === "active" || p.status === "planning").length;
    const troubled = projects.filter((p) => p.status !== "completed" && p.status !== "archived" && (getProjectHealth(p) === "stalled" || getProjectHealth(p) === "at_risk")).length;
    const ideas = captures.filter((c) => c.status === "sent_to_ideas" && c.idea_status !== "archived" && c.idea_status !== "converted_to_project").length;
    const pinned = memories.filter((m) => m.is_pinned && !m.is_archived).length;
    const inbox = captures.filter((c) => c.review_status !== "reviewed" && c.status !== "archived").length;
    return { today, active, troubled, ideas, pinned, inbox };
  }, [captures, projects, memories, getProjectHealth]);

  const cards: SignalCardProps[] = [
    { label: "Today", value: signals.today, icon: CalendarCheck, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Active Projects", value: signals.active, icon: FolderKanban, color: "text-[hsl(var(--brain-blue))]" },
    { label: "Needs Attention", value: signals.troubled, icon: AlertTriangle, color: "text-[hsl(var(--brain-rose))]", sub: "Stalled or at-risk" },
    { label: "Ideas", value: signals.ideas, icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]" },
    { label: "Pinned Memories", value: signals.pinned, icon: Brain, color: "text-primary" },
    { label: "Inbox", value: signals.inbox, icon: Inbox, color: "text-[hsl(var(--brain-amber))]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => <SignalCard key={c.label} {...c} />)}
    </div>
  );
}
