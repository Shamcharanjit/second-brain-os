import { Capture, CaptureCategory } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Mic, Type, ArrowRight, FolderOpen, Gauge, ShieldCheck, ShieldQuestion } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const categoryColors: Record<CaptureCategory, string> = {
  task: "bg-brain-teal/15 text-brain-teal",
  idea: "bg-brain-amber/15 text-brain-amber",
  reminder: "bg-brain-rose/15 text-brain-rose",
  project_note: "bg-brain-blue/15 text-brain-blue",
  follow_up: "bg-brain-purple/15 text-brain-purple",
  maybe_later: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder",
  project_note: "Project Note", follow_up: "Follow-up", maybe_later: "Maybe Later",
};

const urgencyColors = { high: "text-brain-rose", medium: "text-brain-amber", low: "text-muted-foreground" };

interface CaptureCardProps {
  capture: Capture;
  expanded?: boolean;
}

export default function CaptureCard({ capture, expanded = false }: CaptureCardProps) {
  const ai = capture.ai_data;
  if (!ai) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 transition-colors hover:border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {capture.input_type === "voice" ? <Mic className="h-3 w-3 text-muted-foreground" /> : <Type className="h-3 w-3 text-muted-foreground" />}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColors[ai.category]}`}>
            {categoryLabels[ai.category]}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="rounded-md bg-secondary/50 px-3 py-2">
          <p className="text-xs text-muted-foreground italic">"{capture.raw_input}"</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{ai.summary}</p>

      {/* Why it matters */}
      <p className="text-[11px] text-muted-foreground italic">💡 {ai.why_it_matters}</p>

      {/* Priority + Urgency + Due */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase">Priority</span>
          <span className={`text-xs font-bold ${ai.priority_score >= 8 ? "text-brain-rose" : ai.priority_score >= 5 ? "text-brain-amber" : "text-muted-foreground"}`}>
            {ai.priority_score}/10
          </span>
        </div>
        <span className={`text-[10px] font-medium ${urgencyColors[ai.urgency]}`}>
          <Gauge className="h-3 w-3 inline mr-0.5" />
          {ai.urgency} urgency
        </span>
        {ai.due_date && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Due</span>
            <span className="text-xs font-medium">{ai.due_date}</span>
          </div>
        )}
      </div>

      {ai.suggested_project && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3 w-3" />
          <span>{ai.suggested_project}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ai.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>

      {ai.next_action && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-1">
          <ArrowRight className="h-3 w-3" />
          {ai.next_action}
        </div>
      )}
    </div>
  );
}
