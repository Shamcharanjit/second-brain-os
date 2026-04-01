import { Capture, CaptureCategory } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Mic, Type, ArrowRight, FolderOpen, Gauge, ShieldCheck, ShieldQuestion, Target, Lightbulb, ListChecks, Bell, FileText, FolderKanban, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const categoryConfig: Record<CaptureCategory, { label: string; color: string }> = {
  task: { label: "Task", color: "bg-[hsl(var(--brain-teal))]/15 text-[hsl(var(--brain-teal))]" },
  idea: { label: "Idea", color: "bg-[hsl(var(--brain-amber))]/15 text-[hsl(var(--brain-amber))]" },
  reminder: { label: "Reminder", color: "bg-[hsl(var(--brain-rose))]/15 text-[hsl(var(--brain-rose))]" },
  goal: { label: "Goal", color: "bg-[hsl(var(--brain-purple))]/15 text-[hsl(var(--brain-purple))]" },
  note: { label: "Note", color: "bg-[hsl(var(--brain-blue))]/15 text-[hsl(var(--brain-blue))]" },
  project: { label: "Project", color: "bg-[hsl(var(--brain-blue))]/15 text-[hsl(var(--brain-blue))]" },
  follow_up: { label: "Follow-up", color: "bg-[hsl(var(--brain-purple))]/15 text-[hsl(var(--brain-purple))]" },
  maybe_later: { label: "Someday", color: "bg-muted text-muted-foreground" },
};

const urgencyColors = { high: "text-[hsl(var(--brain-rose))]", medium: "text-[hsl(var(--brain-amber))]", low: "text-muted-foreground" };

interface CaptureCardProps {
  capture: Capture;
  expanded?: boolean;
}

export default function CaptureCard({ capture, expanded = false }: CaptureCardProps) {
  const ai = capture.ai_data;
  if (!ai) return null;

  const cat = categoryConfig[ai.category];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 transition-colors hover:border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {capture.input_type === "voice" ? <Mic className="h-3 w-3 text-muted-foreground" /> : <Type className="h-3 w-3 text-muted-foreground" />}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.color}`}>
            {cat.label}
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
          <span className={`text-xs font-bold ${ai.priority_score >= 70 ? "text-[hsl(var(--brain-rose))]" : ai.priority_score >= 45 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
            {ai.priority_score}/100
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

      {/* Routing label */}
      <div className="flex items-center gap-2 text-[10px]">
        {capture.review_status === "auto_approved" && (
          <span className="flex items-center gap-1 text-[hsl(var(--brain-teal))] font-medium">
            <ShieldCheck className="h-3 w-3" /> Auto-Approved
          </span>
        )}
        {capture.review_status === "needs_review" && capture.status === "unprocessed" && (
          <span className="flex items-center gap-1 text-[hsl(var(--brain-amber))] font-medium">
            <ShieldQuestion className="h-3 w-3" /> Needs Review
          </span>
        )}
        {capture.status === "sent_to_today" && (
          <span className="text-[hsl(var(--brain-teal))] font-medium">→ Routed to Today</span>
        )}
        {capture.status === "sent_to_ideas" && (
          <span className="text-[hsl(var(--brain-purple))] font-medium">→ Routed to Ideas Vault</span>
        )}
        {capture.status === "sent_to_projects" && (
          <span className="text-[hsl(var(--brain-blue))] font-medium">→ Routed to Projects</span>
        )}
        {capture.status === "sent_to_someday" && (
          <span className="text-muted-foreground font-medium">→ Routed to Someday</span>
        )}
      </div>

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
