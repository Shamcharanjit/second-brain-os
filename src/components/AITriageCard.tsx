import { AITriageResult } from "@/lib/ai-triage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ListChecks, Lightbulb, Bell, Target,
  FileText, FolderKanban, Clock, ArrowRight, Check, X, Cpu,
} from "lucide-react";

const typeConfig: Record<string, { label: string; icon: typeof ListChecks; colorClass: string }> = {
  task: { label: "Task", icon: ListChecks, colorClass: "text-[hsl(var(--brain-teal))]" },
  idea: { label: "Idea", icon: Lightbulb, colorClass: "text-[hsl(var(--brain-amber))]" },
  reminder: { label: "Reminder", icon: Bell, colorClass: "text-[hsl(var(--brain-rose))]" },
  goal: { label: "Goal", icon: Target, colorClass: "text-[hsl(var(--brain-purple))]" },
  note: { label: "Note", icon: FileText, colorClass: "text-[hsl(var(--brain-blue))]" },
  project: { label: "Project", icon: FolderKanban, colorClass: "text-[hsl(var(--brain-blue))]" },
  follow_up: { label: "Follow-up", icon: Clock, colorClass: "text-[hsl(var(--brain-purple))]" },
  maybe_later: { label: "Someday", icon: Clock, colorClass: "text-muted-foreground" },
};

const destLabels: Record<string, string> = {
  today: "→ Today",
  inbox: "→ Inbox",
  ideas: "→ Ideas Vault",
  projects: "→ Projects",
  memory: "→ Memory",
  someday: "→ Someday",
};

interface AITriageCardProps {
  triage: AITriageResult;
  source: "ai" | "local";
  onApply: () => void;
  onDismiss: () => void;
}

export default function AITriageCard({ triage, source, onApply, onDismiss }: AITriageCardProps) {
  const t = typeConfig[triage.type] || typeConfig.note;
  const Icon = t.icon;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {source === "ai" ? (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {source === "ai" ? "AI Suggestion" : "Smart Sort"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-semibold ${t.colorClass}`}>
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </span>
          <span className="text-[10px] font-bold text-primary">
            {destLabels[triage.recommendedDestination] || "→ Inbox"}
          </span>
        </div>
      </div>

      {/* Title & summary */}
      <div>
        <h4 className="text-sm font-semibold leading-snug">{triage.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{triage.summary}</p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge
          variant={triage.priority === "high" ? "destructive" : "secondary"}
          className="text-[10px] px-1.5 py-0"
        >
          {triage.priority} priority
        </Badge>
        {triage.shouldAddToToday && (
          <span className="text-[10px] font-medium text-[hsl(var(--brain-teal))]">
            ⚡ Add to Today
          </span>
        )}
        {triage.confidence < 1 && (
          <span className="text-[10px] text-muted-foreground">
            {Math.round(triage.confidence * 100)}% confident
          </span>
        )}
      </div>

      {/* Next action */}
      {triage.suggestedNextAction && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <ArrowRight className="h-3 w-3" />
          {triage.suggestedNextAction}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onApply} className="gap-1.5 text-xs">
          <Check className="h-3 w-3" /> Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 text-xs text-muted-foreground">
          <X className="h-3 w-3" /> Keep as-is
        </Button>
      </div>
    </div>
  );
}
