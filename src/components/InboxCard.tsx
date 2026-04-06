import { useState } from "react";
import { Capture, CaptureCategory, CaptureStatus, ConfidenceLevel, UrgencyLevel, DestinationSuggestion } from "@/types/brain";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useIntegrationActions } from "@/hooks/useIntegrationActions";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic, Type, ArrowRight, FolderOpen, Check, X,
  CalendarCheck, Lightbulb, Archive, Clock, Sparkles, Pencil,
  ShieldCheck, ShieldAlert, ShieldQuestion, Gauge, FolderKanban, Hourglass,
  ChevronDown, ChevronUp, Inbox, Brain, Paperclip, FileSearch,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { CaptureSearchMatchResult } from "@/lib/capture-search-match";
import { splitForHighlight } from "@/lib/capture-search-match";

const categoryColors: Record<CaptureCategory, string> = {
  task: "bg-[hsl(var(--brain-teal))]/15 text-[hsl(var(--brain-teal))]",
  idea: "bg-[hsl(var(--brain-amber))]/15 text-[hsl(var(--brain-amber))]",
  reminder: "bg-[hsl(var(--brain-rose))]/15 text-[hsl(var(--brain-rose))]",
  goal: "bg-[hsl(var(--brain-purple))]/15 text-[hsl(var(--brain-purple))]",
  note: "bg-[hsl(var(--brain-blue))]/15 text-[hsl(var(--brain-blue))]",
  project: "bg-[hsl(var(--brain-blue))]/15 text-[hsl(var(--brain-blue))]",
  follow_up: "bg-[hsl(var(--brain-purple))]/15 text-[hsl(var(--brain-purple))]",
  maybe_later: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder", goal: "Goal", note: "Note",
  project: "Project", follow_up: "Follow-up", maybe_later: "Someday",
};

const ALL_CATEGORIES: CaptureCategory[] = ["task", "idea", "reminder", "goal", "note", "project", "follow_up", "maybe_later"];
const ALL_URGENCIES: UrgencyLevel[] = ["low", "medium", "high"];

const confidenceConfig: Record<ConfidenceLevel, { icon: typeof ShieldCheck; label: string; color: string }> = {
  high: { icon: ShieldCheck, label: "High confidence", color: "text-[hsl(var(--brain-teal))]" },
  medium: { icon: ShieldAlert, label: "Medium confidence", color: "text-[hsl(var(--brain-amber))]" },
  needs_review: { icon: ShieldQuestion, label: "Needs review", color: "text-[hsl(var(--brain-rose))]" },
};

const urgencyColors = { high: "text-[hsl(var(--brain-rose))]", medium: "text-[hsl(var(--brain-amber))]", low: "text-muted-foreground" };

const ROUTE_ACTIONS: { label: string; icon: typeof CalendarCheck; status: CaptureStatus; toastMsg: string; color: string }[] = [
  { label: "Today", icon: CalendarCheck, status: "sent_to_today", toastMsg: "Moved to Today", color: "text-[hsl(var(--brain-teal))]" },
  { label: "Projects", icon: FolderKanban, status: "sent_to_projects", toastMsg: "Moved to Projects", color: "text-[hsl(var(--brain-blue))]" },
  { label: "Ideas", icon: Lightbulb, status: "sent_to_ideas", toastMsg: "Moved to Ideas Vault", color: "text-[hsl(var(--brain-amber))]" },
  { label: "Memory", icon: Brain, status: "sent_to_memory", toastMsg: "Saved to Memory", color: "text-primary" },
  { label: "Someday", icon: Hourglass, status: "sent_to_someday", toastMsg: "Moved to Someday", color: "text-muted-foreground" },
  { label: "Keep in Inbox", icon: Inbox, status: "processed", toastMsg: "Kept in Inbox as processed", color: "text-primary" },
];

const destLabel: Record<string, string> = {
  today: "→ Today", inbox: "→ Inbox", ideas: "→ Ideas Vault",
  projects: "→ Projects", someday: "→ Someday", maybe_later: "→ Someday",
  memory: "→ Memory",
};

interface InboxCardProps {
  capture: Capture;
  attachmentCount?: number;
  onOpenDetail?: (capture: Capture) => void;
  searchMatch?: CaptureSearchMatchResult | null;
}

export default function InboxCard({ capture, attachmentCount = 0, onOpenDetail, searchMatch }: InboxCardProps) {
  const ai = capture.ai_data;
  const { approveCapture, editAndApproveCapture, archiveCapture, routeCapture } = useBrain();
  const { linkCapture } = useProjects();
  const { routeToMemory } = useIntegrationActions();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState(ai?.title ?? "");
  const [editCategory, setEditCategory] = useState<CaptureCategory>(ai?.category ?? "task");
  const [editPriority, setEditPriority] = useState(ai?.priority_score ?? 50);
  const [editUrgency, setEditUrgency] = useState<UrgencyLevel>(ai?.urgency ?? "medium");
  const [editNextAction, setEditNextAction] = useState(ai?.next_action ?? "");
  const [editTags, setEditTags] = useState(ai?.tags.join(", ") ?? "");

  if (!ai) return null;

  const isReviewed = capture.review_status === "reviewed";
  const isArchived = capture.status === "archived";
  const conf = confidenceConfig[ai.confidence];
  const ConfIcon = conf.icon;

  const handleApprove = () => {
    approveCapture(capture.id);
    const dest = destLabel[ai.destination_suggestion] ?? "Inbox";
    toast.success(`Approved and routed ${dest}`, { description: "InsightHalo confirmed your decision." });
  };

  const handleRoute = (status: CaptureStatus, msg: string) => {
    if (status === "sent_to_memory") {
      routeToMemory(capture);
      toast.success(msg);
      return;
    }
    routeCapture(capture.id, status);
    toast.success(msg);
  };

  const handleArchive = () => {
    archiveCapture(capture.id);
    toast("Archived from active workflow", { description: "You can find it in archived items." });
  };

  const startEditing = () => {
    setEditTitle(ai.title);
    setEditCategory(ai.category);
    setEditPriority(ai.priority_score);
    setEditUrgency(ai.urgency);
    setEditNextAction(ai.next_action);
    setEditTags(ai.tags.join(", "));
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const saveEdits = (targetStatus: CaptureStatus, toastMsg: string) => {
    const updates = {
      title: editTitle,
      category: editCategory,
      priority_score: editPriority,
      urgency: editUrgency,
      next_action: editNextAction,
      tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    editAndApproveCapture(capture.id, updates, targetStatus);
    // If routing to Memory via edit, create real MemoryEntry
    if (targetStatus === "sent_to_memory") {
      const updatedCapture = { ...capture, ai_data: capture.ai_data ? { ...capture.ai_data, ...updates } : capture.ai_data, status: targetStatus } as Capture;
      routeToMemory(updatedCapture);
    }
    setEditing(false);
    toast.success(toastMsg, { description: "Edits saved." });
  };

  if (isArchived) return null;

  // Reviewed/routed state - compact display
  if (isReviewed) {
    const statusLabels: Record<string, string> = {
      processed: "Processed", sent_to_today: "→ Today", sent_to_ideas: "→ Ideas Vault",
      sent_to_projects: "→ Projects", sent_to_someday: "→ Someday", sent_to_memory: "→ Memory",
    };
    return (
      <div
        className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 opacity-70 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => onOpenDetail?.(capture)}
      >
        <Check className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{ai.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{ai.summary}</p>
          {searchMatch && <SearchMatchSnippet match={searchMatch} />}
        </div>
        {attachmentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Paperclip className="h-3 w-3" /> {attachmentCount}
          </span>
        )}
        <Badge variant="outline" className="text-[10px] shrink-0">{statusLabels[capture.status] ?? capture.status}</Badge>
        {capture.manually_adjusted && (
          <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
            <Pencil className="h-2.5 w-2.5" /> Edited
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="p-5 space-y-4">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryColors[ai.category]}`}>
              {capture.input_type === "voice" ? <Mic className="h-3 w-3" /> : <Type className="h-3 w-3" />}
              {categoryLabels[ai.category]}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${
              ai.priority_score >= 70 ? "bg-[hsl(var(--brain-rose))]/10 border-[hsl(var(--brain-rose))]/20 text-[hsl(var(--brain-rose))]"
              : ai.priority_score >= 45 ? "bg-[hsl(var(--brain-amber))]/10 border-[hsl(var(--brain-amber))]/20 text-[hsl(var(--brain-amber))]"
              : "bg-muted border-border text-muted-foreground"
            }`}>
              {ai.priority_score}/100
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${conf.color}`}>
              <ConfIcon className="h-3 w-3" />
              {conf.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            {attachmentCount > 0 && (
              <button
                onClick={() => onOpenDetail?.(capture)}
                className="inline-flex items-center gap-1 mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Paperclip className="h-3 w-3" /> {attachmentCount}
              </button>
            )}
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Raw capture - collapsible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left rounded-lg bg-secondary/60 border border-border/50 px-4 py-2.5 flex items-center justify-between hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Type className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className={`text-xs text-muted-foreground italic ${expanded ? "" : "truncate"}`}>
              "{capture.raw_input}"
            </p>
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </button>

        {/* AI interpretation */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 space-y-3">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Organized Into
          </p>

          {!editing ? (
            <>
              <h3 className="text-base font-semibold leading-snug tracking-tight">{ai.title}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{ai.summary}</p>
              <p className="text-xs text-muted-foreground italic">💡 {ai.why_it_matters}</p>

              <div className="flex items-center gap-4 text-[11px] flex-wrap">
                <span className={`font-medium ${urgencyColors[ai.urgency]}`}>
                  <Gauge className="h-3 w-3 inline mr-1" />
                  {ai.urgency.charAt(0).toUpperCase() + ai.urgency.slice(1)} urgency
                </span>
                {ai.due_context !== "none" && (
                  <span className="text-muted-foreground">Due: {ai.due_context.replace("_", " ")}</span>
                )}
                {ai.suggested_project && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <FolderOpen className="h-3 w-3" /> {ai.suggested_project}
                  </span>
                )}
              </div>

              {ai.next_action && (
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-primary">{ai.next_action}</p>
                </div>
              )}

              {/* AI destination suggestion */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">AI suggests:</span>
                <span className="font-semibold text-primary">{destLabel[ai.destination_suggestion] ?? "Inbox"}</span>
              </div>
            </>
          ) : (
            /* ── Inline Edit Panel ── */
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CaptureCategory)}
                    className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Urgency</label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value as UrgencyLevel)}
                    className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {ALL_URGENCIES.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Priority ({editPriority}/100)</label>
                <input
                  type="range" min={1} max={100} value={editPriority}
                  onChange={(e) => setEditPriority(Number(e.target.value))}
                  className="w-full mt-1 accent-[hsl(var(--primary))]"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Next Action</label>
                <Input value={editNextAction} onChange={(e) => setEditNextAction(e.target.value)} className="h-8 text-sm mt-1" />
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
                <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} className="h-8 text-sm mt-1" />
              </div>

              {/* Edit save destinations */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] text-muted-foreground font-medium">Save & route to:</span>
                {ROUTE_ACTIONS.map((r) => (
                  <Button key={r.status} size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    onClick={() => saveEdits(r.status, r.toastMsg)}>
                    <r.icon className={`h-3 w-3 ${r.color}`} /> {r.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditing}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {!editing && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {ai.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Review reason banner */}
        {!editing && ai.review_reason && (
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--brain-amber))]/8 border border-[hsl(var(--brain-amber))]/15 px-3 py-2 text-[11px]">
            <ShieldQuestion className="h-3.5 w-3.5 text-[hsl(var(--brain-amber))] shrink-0" />
            <span className="text-muted-foreground"><span className="font-semibold text-foreground">Why review?</span> {ai.review_reason}</span>
          </div>
        )}

        {/* Primary Actions */}
        {!editing && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            {/* Primary row */}
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleApprove}>
                <Check className="h-3 w-3" /> Approve AI Suggestion
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={startEditing}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 ml-auto text-muted-foreground" onClick={handleArchive}>
                <Archive className="h-3 w-3" /> Archive
              </Button>
            </div>

            {/* Quick route row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium mr-1">Quick route:</span>
              {ROUTE_ACTIONS.map((r) => (
                <Button key={r.status} size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => handleRoute(r.status, r.toastMsg)}>
                  <r.icon className={`h-3 w-3 ${r.color}`} /> {r.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2"
                onClick={() => setShowCreateProject(true)}>
                <FolderKanban className="h-3 w-3 text-[hsl(var(--brain-blue))]" /> Create Project
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreateProject && (
        <CreateProjectDialog
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          defaultName={ai.title}
          defaultDescription={ai.summary}
          sourceIdeaId={capture.id}
          initialNextAction={ai.next_action}
        />
      )}
    </div>
  );
}
