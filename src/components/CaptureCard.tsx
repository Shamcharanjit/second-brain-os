import { Capture, CaptureCategory } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic, Type, ArrowRight, FolderOpen, Gauge, ShieldCheck, ShieldQuestion,
  Clock, CalendarCheck, Lightbulb, Brain, FolderKanban, Pin, Archive, Pencil,
} from "lucide-react";
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
  onEdit?: (id: string) => void;
  onConvertToProject?: (id: string) => void;
  onConvertToMemory?: (id: string) => void;
  onPin?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export default function CaptureCard({
  capture, expanded = false,
  onEdit, onConvertToProject, onConvertToMemory, onPin, onArchive,
}: CaptureCardProps) {
  const ai = capture.ai_data;
  if (!ai) return null;

  const cat = categoryConfig[ai.category];
  const hasActions = onEdit || onConvertToProject || onConvertToMemory || onPin || onArchive;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 transition-all hover:shadow-sm group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            {capture.input_type === "voice" ? <Mic className="h-4 w-4 text-primary" /> : <Type className="h-4 w-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ai.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.color}`}>
            {cat.label}
          </span>
          <span className={`text-[10px] font-bold ${ai.priority_score >= 70 ? "text-[hsl(var(--brain-rose))]" : ai.priority_score >= 45 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
            {ai.priority_score}/100
          </span>
        </div>
      </div>

      {expanded && (
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-xs text-muted-foreground italic">"{capture.raw_input}"</p>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        <span className={`font-medium ${urgencyColors[ai.urgency]}`}>
          <Gauge className="h-3 w-3 inline mr-0.5" />
          {ai.urgency} urgency
        </span>
        {ai.due_date && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> {ai.due_date}
          </span>
        )}
        {ai.suggested_project && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <FolderOpen className="h-3 w-3" /> {ai.suggested_project}
          </span>
        )}
        <span className="text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Tags */}
      {ai.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {ai.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Next action */}
      {ai.next_action && (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <ArrowRight className="h-3 w-3" />
          {ai.next_action}
        </div>
      )}

      {/* Routing status */}
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
        {capture.status === "sent_to_today" && <span className="text-[hsl(var(--brain-teal))] font-medium">→ Today</span>}
        {capture.status === "sent_to_ideas" && <span className="text-[hsl(var(--brain-purple))] font-medium">→ Ideas Vault</span>}
        {capture.status === "sent_to_projects" && <span className="text-[hsl(var(--brain-blue))] font-medium">→ Projects</span>}
        {capture.status === "sent_to_someday" && <span className="text-muted-foreground font-medium">→ Someday</span>}
      </div>

      {/* Quick actions — visible on hover */}
      {hasActions && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onEdit(capture.id)}>
              <Pencil className="h-2.5 w-2.5" /> Edit
            </Button>
          )}
          {onConvertToProject && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onConvertToProject(capture.id)}>
              <FolderKanban className="h-2.5 w-2.5" /> Project
            </Button>
          )}
          {onConvertToMemory && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onConvertToMemory(capture.id)}>
              <Brain className="h-2.5 w-2.5" /> Memory
            </Button>
          )}
          {onPin && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onPin(capture.id)}>
              <Pin className="h-2.5 w-2.5" /> {capture.is_pinned_today ? "Unpin" : "Pin"}
            </Button>
          )}
          {onArchive && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground ml-auto" onClick={() => onArchive(capture.id)}>
              <Archive className="h-2.5 w-2.5" /> Archive
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
