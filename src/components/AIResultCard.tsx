import { Capture, CaptureCategory } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Target, Lightbulb, ListChecks, Bell,
  FileText, FolderKanban, Clock, Gauge, Sparkles,
} from "lucide-react";

const categoryConfig: Record<CaptureCategory, { label: string; icon: typeof ListChecks; color: string }> = {
  task: { label: "Task", icon: ListChecks, color: "text-[hsl(var(--brain-teal))]" },
  idea: { label: "Idea", icon: Lightbulb, color: "text-[hsl(var(--brain-amber))]" },
  reminder: { label: "Reminder", icon: Bell, color: "text-[hsl(var(--brain-rose))]" },
  goal: { label: "Goal", icon: Target, color: "text-[hsl(var(--brain-purple))]" },
  note: { label: "Note", icon: FileText, color: "text-[hsl(var(--brain-blue))]" },
  project: { label: "Project", icon: FolderKanban, color: "text-[hsl(var(--brain-blue))]" },
  follow_up: { label: "Follow-up", icon: Clock, color: "text-[hsl(var(--brain-purple))]" },
  maybe_later: { label: "Someday", icon: Clock, color: "text-muted-foreground" },
};

const destLabels: Record<string, { label: string; color: string }> = {
  today: { label: "→ Today", color: "text-[hsl(var(--brain-teal))]" },
  inbox: { label: "→ Inbox", color: "text-[hsl(var(--brain-amber))]" },
  ideas: { label: "→ Ideas Vault", color: "text-[hsl(var(--brain-purple))]" },
  projects: { label: "→ Projects", color: "text-[hsl(var(--brain-blue))]" },
  someday: { label: "→ Someday", color: "text-muted-foreground" },
  maybe_later: { label: "→ Someday", color: "text-muted-foreground" },
};

interface AIResultCardProps {
  capture: Capture;
}

export default function AIResultCard({ capture }: AIResultCardProps) {
  const ai = capture.ai_data;
  if (!ai) return null;

  const cat = categoryConfig[ai.category];
  const dest = destLabels[ai.destination_suggestion];
  const CatIcon = cat.icon;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-400">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Result</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-semibold ${cat.color}`}>
            <CatIcon className="h-3.5 w-3.5" />
            {cat.label}
          </span>
          {dest && (
            <span className={`text-[10px] font-bold ${dest.color}`}>{dest.label}</span>
          )}
        </div>
      </div>

      {/* Title & summary */}
      <div>
        <h4 className="text-sm font-semibold leading-snug">{ai.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{ai.summary}</p>
      </div>

      {/* Priority & urgency */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">Priority</span>
          <span className={`text-xs font-bold ${ai.priority_score >= 70 ? "text-[hsl(var(--brain-rose))]" : ai.priority_score >= 45 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
            {ai.priority_score}/100
          </span>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-medium ${ai.urgency === "high" ? "text-[hsl(var(--brain-rose))]" : ai.urgency === "medium" ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
          <Gauge className="h-3 w-3" />
          {ai.urgency} urgency
        </span>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ai.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
        ))}
      </div>

      {/* Next action */}
      {ai.next_action && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <ArrowRight className="h-3 w-3" />
          {ai.next_action}
        </div>
      )}
    </div>
  );
}
