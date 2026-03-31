import { Capture, CaptureCategory, ConfidenceLevel } from "@/types/brain";
import { useBrain } from "@/context/BrainContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic, Type, ArrowRight, FolderOpen, Check,
  CalendarCheck, Lightbulb, Archive, Clock, Sparkles,
  ShieldCheck, ShieldAlert, ShieldQuestion, Gauge,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const categoryColors: Record<CaptureCategory, string> = {
  task: "bg-brain-teal/15 text-brain-teal border-brain-teal/20",
  idea: "bg-brain-amber/15 text-brain-amber border-brain-amber/20",
  reminder: "bg-brain-rose/15 text-brain-rose border-brain-rose/20",
  project_note: "bg-brain-blue/15 text-brain-blue border-brain-blue/20",
  follow_up: "bg-brain-purple/15 text-brain-purple border-brain-purple/20",
  maybe_later: "bg-muted text-muted-foreground border-border",
};

const categoryLabels: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder",
  project_note: "Project Note", follow_up: "Follow-up", maybe_later: "Maybe Later",
};

const priorityColor = (score: number) => {
  if (score >= 8) return "text-brain-rose font-bold";
  if (score >= 5) return "text-brain-amber font-semibold";
  return "text-muted-foreground font-medium";
};

const priorityBg = (score: number) => {
  if (score >= 8) return "bg-brain-rose/10 border-brain-rose/20";
  if (score >= 5) return "bg-brain-amber/10 border-brain-amber/20";
  return "bg-muted border-border";
};

const confidenceConfig: Record<ConfidenceLevel, { icon: typeof ShieldCheck; label: string; color: string }> = {
  high: { icon: ShieldCheck, label: "High confidence", color: "text-brain-teal" },
  medium: { icon: ShieldAlert, label: "Medium confidence", color: "text-brain-amber" },
  needs_review: { icon: ShieldQuestion, label: "Needs review", color: "text-brain-rose" },
};

const urgencyColors = { high: "text-brain-rose", medium: "text-brain-amber", low: "text-muted-foreground" };
const effortLabels = { low: "Quick", medium: "Moderate", high: "Deep work" };

export default function InboxCard({ capture }: { capture: Capture }) {
  const ai = capture.ai_data;
  const { updateCaptureStatus } = useBrain();
  if (!ai) return null;

  const isProcessed = capture.status === "processed";
  const isSentToday = capture.status === "sent_to_today";
  const isSentIdeas = capture.status === "sent_to_ideas";
  const hasAction = isProcessed || isSentToday || isSentIdeas;

  const conf = confidenceConfig[ai.confidence];
  const ConfIcon = conf.icon;

  const handleApprove = () => { updateCaptureStatus(capture.id, "processed"); toast.success("Marked as processed"); };
  const handleSendToday = () => { updateCaptureStatus(capture.id, "sent_to_today"); toast.success("Sent to Today"); };
  const handleSendIdeas = () => { updateCaptureStatus(capture.id, "sent_to_ideas"); toast.success("Sent to Ideas Vault"); };
  const handleArchive = () => { updateCaptureStatus(capture.id, "archived"); toast("Archived"); };

  return (
    <div className={`rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${hasAction ? "opacity-60" : ""}`}>
      {hasAction && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0">
          <Check className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-primary">
            {isProcessed && "Processed"}{isSentToday && "Sent to Today"}{isSentIdeas && "Sent to Ideas Vault"}
          </span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryColors[ai.category]}`}>
              {capture.input_type === "voice" ? <Mic className="h-3 w-3" /> : <Type className="h-3 w-3" />}
              {categoryLabels[ai.category]}
            </span>
            <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${priorityBg(ai.priority_score)}`}>
              <span className={priorityColor(ai.priority_score)}>{ai.priority_score}/10</span>
            </div>
            {/* Confidence badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${conf.color}`}>
              <ConfIcon className="h-3 w-3" />
              {conf.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Raw capture */}
        <div className="rounded-lg bg-secondary/60 border border-border/50 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Type className="h-3 w-3" /> Raw Capture
          </p>
          <p className="text-sm text-foreground/80 italic leading-relaxed">"{capture.raw_input}"</p>
        </div>

        {/* AI interpretation */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 space-y-3">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Organized Into
          </p>
          <h3 className="text-base font-semibold leading-snug tracking-tight">{ai.title}</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{ai.summary}</p>

          {/* Why it matters */}
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            💡 {ai.why_it_matters}
          </p>

          {/* Urgency + Effort indicators */}
          <div className="flex items-center gap-4 text-[11px]">
            <span className={`font-medium ${urgencyColors[ai.urgency]}`}>
              <Gauge className="h-3 w-3 inline mr-1" />
              {ai.urgency.charAt(0).toUpperCase() + ai.urgency.slice(1)} urgency
            </span>
            <span className="text-muted-foreground">
              Effort: {effortLabels[ai.effort]}
            </span>
            {ai.due_context !== "none" && (
              <span className="text-muted-foreground">
                Due: {ai.due_context.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            {ai.due_date && (
              <div className="rounded-md bg-brain-rose/5 border border-brain-rose/10 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Due</p>
                <p className="text-sm font-semibold text-brain-rose">{ai.due_date}</p>
              </div>
            )}
            {ai.suggested_project && (
              <div className="rounded-md bg-brain-blue/5 border border-brain-blue/10 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Project</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <FolderOpen className="h-3 w-3 text-brain-blue" />
                  {ai.suggested_project}
                </p>
              </div>
            )}
          </div>

          {/* Next action */}
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Next Action</p>
              <p className="text-sm font-medium text-primary">{ai.next_action}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ai.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">{tag}</Badge>
          ))}
        </div>

        {/* Actions */}
        {!hasAction && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button size="sm" variant="default" className="h-8 text-xs gap-1.5" onClick={handleApprove}>
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleSendToday}>
              <CalendarCheck className="h-3 w-3" /> To Today
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleSendIdeas}>
              <Lightbulb className="h-3 w-3" /> To Ideas
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 ml-auto text-muted-foreground" onClick={handleArchive}>
              <Archive className="h-3 w-3" /> Archive
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
