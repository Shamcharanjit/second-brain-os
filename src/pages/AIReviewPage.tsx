import { useMemo } from "react";
import {
  BrainCircuit, ShieldCheck, ShieldQuestion, AlertTriangle, Zap,
  Mic, Type, FolderOpen, ArrowRight, Check, CalendarCheck, Lightbulb,
  Archive, Clock, Sparkles, Gauge, Inbox,
} from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Capture, CaptureCategory, ConfidenceLevel } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const categoryColors: Record<CaptureCategory, string> = {
  task: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]",
  idea: "bg-[hsl(var(--brain-amber))/0.12] text-[hsl(var(--brain-amber))]",
  reminder: "bg-[hsl(var(--brain-rose))/0.12] text-[hsl(var(--brain-rose))]",
  goal: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]",
  note: "bg-[hsl(var(--brain-blue))/0.12] text-[hsl(var(--brain-blue))]",
  project: "bg-[hsl(var(--brain-blue))/0.12] text-[hsl(var(--brain-blue))]",
  follow_up: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]",
  maybe_later: "bg-muted text-muted-foreground",
};
const categoryLabels: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder", goal: "Goal", note: "Note",
  project: "Project", follow_up: "Follow-up", maybe_later: "Someday",
};

const DEST_LABELS: Record<string, { label: string; color: string }> = {
  today: { label: "→ Today", color: "text-[hsl(var(--brain-teal))]" },
  inbox: { label: "→ Inbox", color: "text-[hsl(var(--brain-amber))]" },
  ideas: { label: "→ Ideas Vault", color: "text-[hsl(var(--brain-purple))]" },
  maybe_later: { label: "→ Maybe Later", color: "text-muted-foreground" },
};

export default function AIReviewPage() {
  const { captures, updateCaptureStatus, updateReviewStatus } = useBrain();

  const needsReview = useMemo(
    () => captures.filter((c) => c.review_status === "needs_review" && c.status === "unprocessed"),
    [captures]
  );

  const autoApproved = useMemo(
    () => captures.filter((c) => c.review_status === "auto_approved").slice(0, 8),
    [captures]
  );

  const stats = useMemo(() => ({
    pending: needsReview.length,
    autoApproved: captures.filter((c) => c.review_status === "auto_approved").length,
    ambiguous: captures.filter((c) => c.ai_data?.confidence === "needs_review").length,
    highImpact: captures.filter((c) => c.review_status === "needs_review" && (c.ai_data?.priority_score ?? 0) >= 7).length,
  }), [captures, needsReview]);

  const kpiCards = [
    { label: "Pending Review", value: stats.pending, icon: ShieldQuestion, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Auto-Approved", value: stats.autoApproved, icon: ShieldCheck, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Ambiguous", value: stats.ambiguous, icon: AlertTriangle, color: "text-[hsl(var(--brain-rose))]" },
    { label: "High-Impact Items", value: stats.highImpact, icon: Zap, color: "text-[hsl(var(--brain-purple))]" },
  ];

  const handleApproveRoute = (c: Capture) => {
    const dest = c.ai_data?.destination_suggestion;
    if (dest === "today") updateCaptureStatus(c.id, "sent_to_today");
    else if (dest === "ideas" || dest === "maybe_later") updateCaptureStatus(c.id, "sent_to_ideas");
    else updateCaptureStatus(c.id, "processed");
    updateReviewStatus(c.id, "reviewed");
    toast.success(`Approved → routed to ${dest || "inbox"}`);
  };

  const handleSendTo = (c: Capture, dest: "sent_to_today" | "sent_to_ideas" | "processed") => {
    updateCaptureStatus(c.id, dest);
    updateReviewStatus(c.id, "reviewed");
    const label = dest === "sent_to_today" ? "Today" : dest === "sent_to_ideas" ? "Ideas Vault" : "Inbox";
    toast.success(`Sent to ${label}`);
  };

  const handleDismiss = (c: Capture) => {
    updateCaptureStatus(c.id, "archived");
    updateReviewStatus(c.id, "reviewed");
    toast("Dismissed");
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, confirm, and refine AI decisions before they become commitments.
        </p>
      </div>

      {/* KPI Bar */}
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

      {/* Review Queue */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Review Queue
            {needsReview.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[hsl(var(--brain-amber))/0.15] text-[hsl(var(--brain-amber))] text-[10px] font-bold px-1.5 py-0.5">
                {needsReview.length}
              </span>
            )}
          </h2>
        </div>

        {needsReview.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center space-y-2">
            <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No items need review right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {needsReview.map((capture) => (
              <ReviewCard
                key={capture.id}
                capture={capture}
                onApprove={() => handleApproveRoute(capture)}
                onSendToday={() => handleSendTo(capture, "sent_to_today")}
                onSendIdeas={() => handleSendTo(capture, "sent_to_ideas")}
                onSendInbox={() => handleSendTo(capture, "processed")}
                onDismiss={() => handleDismiss(capture)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Auto-Approved Feed */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Auto-Approved Today</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">AI routed these automatically with high confidence.</p>

        {autoApproved.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No auto-approved items yet.</p>
        ) : (
          <div className="space-y-2">
            {autoApproved.map((c) => {
              const ai = c.ai_data;
              if (!ai) return null;
              const dest = DEST_LABELS[ai.destination_suggestion];
              return (
                <div key={c.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[hsl(var(--brain-teal))] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ai.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${categoryColors[ai.category]}`}>
                        {categoryLabels[ai.category]}
                      </span>
                      {dest && <span className={`font-medium ${dest.color}`}>{dest.label}</span>}
                      {ai.suggested_project && (
                        <span className="flex items-center gap-0.5">
                          <FolderOpen className="h-2.5 w-2.5" /> {ai.suggested_project}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Review Card Component ── */
function ReviewCard({
  capture,
  onApprove,
  onSendToday,
  onSendIdeas,
  onSendInbox,
  onDismiss,
}: {
  capture: Capture;
  onApprove: () => void;
  onSendToday: () => void;
  onSendIdeas: () => void;
  onSendInbox: () => void;
  onDismiss: () => void;
}) {
  const ai = capture.ai_data;
  if (!ai) return null;

  const dest = DEST_LABELS[ai.destination_suggestion];

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="p-5 space-y-4">
        {/* Why review banner */}
        {ai.review_reason && (
          <div className="rounded-lg bg-[hsl(var(--brain-amber))/0.08] border border-[hsl(var(--brain-amber))/0.15] px-4 py-2.5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-amber))] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-[hsl(var(--brain-amber))] uppercase tracking-wider">Why Review?</p>
              <p className="text-xs text-foreground/80 mt-0.5">{ai.review_reason}</p>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryColors[ai.category]}`}>
              {capture.input_type === "voice" ? <Mic className="h-3 w-3" /> : <Type className="h-3 w-3" />}
              {categoryLabels[ai.category]}
            </span>
            {capture.input_type === "voice" && (
              <Badge variant="outline" className="text-[10px] gap-1 border-[hsl(var(--brain-purple))/0.3] text-[hsl(var(--brain-purple))]">
                <Mic className="h-2.5 w-2.5" /> Voice
              </Badge>
            )}
            <span className={`text-[10px] font-bold ${ai.priority_score >= 8 ? "text-[hsl(var(--brain-rose))]" : ai.priority_score >= 5 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
              {ai.priority_score}/10
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Raw capture */}
        <div className="rounded-lg bg-secondary/60 border border-border/50 px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Raw Capture</p>
          <p className="text-sm text-foreground/80 italic">"{capture.raw_input}"</p>
        </div>

        {/* AI interpretation */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Interpretation
          </p>
          <h3 className="text-base font-semibold">{ai.title}</h3>
          <p className="text-sm text-foreground/80">{ai.summary}</p>
          <p className="text-xs text-muted-foreground italic">💡 {ai.why_it_matters}</p>

          {/* Suggested routing */}
          <div className="flex items-center gap-4 text-[11px] flex-wrap">
            {dest && (
              <span className={`font-semibold ${dest.color}`}>Suggested: {dest.label}</span>
            )}
            <span className={`font-medium ${ai.urgency === "high" ? "text-[hsl(var(--brain-rose))]" : ai.urgency === "medium" ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
              <Gauge className="h-3 w-3 inline mr-0.5" />{ai.urgency} urgency
            </span>
            {ai.suggested_project && (
              <span className="text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> {ai.suggested_project}
              </span>
            )}
            {ai.due_context !== "none" && (
              <span className="text-muted-foreground">Due: {ai.due_context.replace("_", " ")}</span>
            )}
          </div>

          {/* Next action */}
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-1">
            <ArrowRight className="h-3 w-3" /> {ai.next_action}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ai.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">{tag}</Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onApprove}>
            <Check className="h-3 w-3" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendToday}>
            <CalendarCheck className="h-3 w-3" /> To Today
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendIdeas}>
            <Lightbulb className="h-3 w-3" /> To Ideas
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendInbox}>
            <Inbox className="h-3 w-3" /> To Inbox
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 ml-auto text-muted-foreground" onClick={onDismiss}>
            <Archive className="h-3 w-3" /> Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
