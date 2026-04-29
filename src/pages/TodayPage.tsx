import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useIntegrationActions } from "@/hooks/useIntegrationActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck, Clock, AlertTriangle, CheckCircle2, Zap, Star,
  ArrowRight, Check, Inbox, Hourglass, FolderKanban,
  Pencil, X, ChevronDown, Gauge, Undo2, BrainCircuit, GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Capture, CaptureCategory, UrgencyLevel } from "@/types/brain";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const categoryLabel: Record<CaptureCategory, string> = {
  task: "Task", idea: "Idea", reminder: "Reminder", goal: "Goal", note: "Note",
  project: "Project", follow_up: "Follow-up", maybe_later: "Someday",
};

const priorityColor = (s: number) =>
  s >= 70 ? "text-[hsl(var(--brain-rose))]" : s >= 45 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground";

const urgencyColors: Record<string, string> = {
  high: "text-[hsl(var(--brain-rose))]", medium: "text-[hsl(var(--brain-amber))]", low: "text-muted-foreground",
};

const ALL_CATEGORIES: CaptureCategory[] = ["task", "idea", "reminder", "goal", "note", "project", "follow_up", "maybe_later"];
const ALL_URGENCIES: UrgencyLevel[] = ["low", "medium", "high"];

export default function TodayPage() {
  const {
    captures, completeCapture, uncompleteCapture, togglePinToday,
    routeCapture, editCaptureAI,
  } = useBrain();
  const { syncCompletionToProject } = useIntegrationActions();
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState(50);
  const [editUrgency, setEditUrgency] = useState<UrgencyLevel>("medium");
  const [editNextAction, setEditNextAction] = useState("");
  const [editTags, setEditTags] = useState("");

  // Drag-to-reorder: manual sort order for the queue section (not pinned items).
  // Persisted to localStorage per calendar day so order survives page refresh.
  const todayKey = `today_order_${format(new Date(), "yyyy-MM-dd")}`;
  const [manualOrder, setManualOrder] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(todayKey) ?? "{}"); } catch { return {}; }
  });

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    // Read current ids from the DOM order via a ref-free approach:
    // we'll use setManualOrder with a functional updater and pass the ordered ids via closure
    setManualOrder((prev) => {
      // Reconstruct current queue order from prev
      const ids = Object.keys(prev).sort((a, b) => (prev[a] ?? 9999) - (prev[b] ?? 9999));
      // Also include any items not yet in prev (new arrivals at the end)
      const allIds = Array.from(new Set([...ids, dragActive.id as string, over.id as string]));
      const oldIdx = allIds.indexOf(dragActive.id as string);
      const newIdx = allIds.indexOf(over.id as string);
      const newIds = arrayMove(allIds, oldIdx, newIdx);
      const next: Record<string, number> = {};
      newIds.forEach((id, i) => { next[id] = i; });
      try { localStorage.setItem(todayKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [todayKey]);

  /* ── Today items = sent_to_today ── */
  const todayItems = useMemo(() => {
    return captures.filter((c) => c.status === "sent_to_today");
  }, [captures]);

  const active = useMemo(() => {
    return todayItems
      .filter((c) => !c.is_completed)
      .sort((a, b) => {
        // Pinned first
        if (a.is_pinned_today !== b.is_pinned_today) return a.is_pinned_today ? -1 : 1;
        // Then urgency
        const uOrder = { high: 3, medium: 2, low: 1 };
        const uDiff = (uOrder[b.ai_data?.urgency ?? "low"] ?? 0) - (uOrder[a.ai_data?.urgency ?? "low"] ?? 0);
        if (uDiff !== 0) return uDiff;
        // Then priority
        return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      });
  }, [todayItems]);

  const completed = useMemo(() => {
    return todayItems.filter((c) => c.is_completed).sort((a, b) =>
      new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime()
    );
  }, [todayItems]);

  const pinned = active.filter((c) => c.is_pinned_today);
  const queue = active.filter((c) => !c.is_pinned_today);

  // Apply manual drag order to queue; new items (not yet in manualOrder) go to the end
  const orderedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      const aIdx = manualOrder[a.id] ?? 9999;
      const bIdx = manualOrder[b.id] ?? 9999;
      return aIdx - bIdx;
    });
  }, [queue, manualOrder]);
  const pinnedCount = pinned.length;

  // Stats
  const highPriorityRemaining = active.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65).length;
  const focusScore = todayItems.length > 0 ? Math.round((completed.length / todayItems.length) * 100) : 0;

  // Motivational line
  const motivational = useMemo(() => {
    if (todayItems.length === 0) return "No items for today yet. Capture a thought or route items here.";
    if (active.length === 0) return `All ${completed.length} items completed — incredible focus! 🎯`;
    if (completed.length > 0) return `You've completed ${completed.length} of ${todayItems.length} items. Keep the momentum.`;
    if (highPriorityRemaining > 0) return `${highPriorityRemaining} high-priority item${highPriorityRemaining > 1 ? "s" : ""} need${highPriorityRemaining === 1 ? "s" : ""} your attention today.`;
    return `${active.length} item${active.length > 1 ? "s" : ""} ready for today. Clear these to create momentum.`;
  }, [todayItems, active, completed, highPriorityRemaining]);

  const handleComplete = (id: string) => {
    const capture = captures.find((c) => c.id === id);
    completeCapture(id);
    if (capture) syncCompletionToProject(capture);
    toast.success("Marked complete");
  };

  const handleUncomplete = (id: string) => {
    uncompleteCapture(id);
    toast("Moved back to active");
  };

  const handleDefer = (id: string, dest: "processed" | "sent_to_someday" | "sent_to_projects", label: string) => {
    routeCapture(id, dest);
    toast(`Deferred — ${label}`);
  };

  const startEdit = (c: Capture) => {
    const ai = c.ai_data!;
    setEditingId(c.id);
    setEditTitle(ai.title);
    setEditPriority(ai.priority_score);
    setEditUrgency(ai.urgency);
    setEditNextAction(ai.next_action);
    setEditTags(ai.tags.join(", "));
  };

  const saveEdit = () => {
    if (!editingId) return;
    editCaptureAI(editingId, {
      title: editTitle,
      priority_score: editPriority,
      urgency: editUrgency,
      next_action: editNextAction,
      tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setEditingId(null);
    toast.success("Updated");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground mt-1">{motivational}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
          {format(new Date(), "EEEE, MMM d")}
        </span>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<CalendarCheck className="h-4 w-4" />} label="Active" value={active.length} accent="text-[hsl(var(--brain-teal))]" />
        <KPI icon={<AlertTriangle className="h-4 w-4" />} label="High Priority" value={highPriorityRemaining} accent="text-[hsl(var(--brain-rose))]" highlight={highPriorityRemaining > 0} />
        <KPI icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={completed.length} accent="text-primary" />
        <KPI icon={<Zap className="h-4 w-4" />} label="Focus Score" value={`${focusScore}%`} accent="text-[hsl(var(--brain-purple))]" />
      </div>

      {/* ── Top Focus (Pinned) ── */}
      {pinned.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[hsl(var(--brain-amber))] fill-[hsl(var(--brain-amber))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Focus</h2>
            <span className="text-[10px] text-muted-foreground">({pinned.length}/3 slots)</span>
          </div>
          <div className="space-y-3">
            {pinned.map((c, i) => (
              <TodayCard
                key={c.id} capture={c} rank={i + 1} isPinSection
                onComplete={handleComplete} onDefer={handleDefer}
                onTogglePin={togglePinToday} onEdit={startEdit}
                editingId={editingId}
                editState={{ editTitle, setEditTitle, editPriority, setEditPriority, editUrgency, setEditUrgency, editNextAction, setEditNextAction, editTags, setEditTags }}
                onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Today Queue ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today Queue</h2>
          {queue.length > 0 && <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{queue.length}</Badge>}
        </div>
        {active.length === 0 && pinned.length === 0 ? (
          captures.length === 0 ? (
            /* Brand new user — no captures at all */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-1">
                <BrainCircuit className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Today starts with a capture</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Your daily focus list lives here. Capture thoughts in your Inbox — then route the important ones to Today.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/app")}>
                  <Zap className="h-3.5 w-3.5" /> Capture first thought
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => navigate("/app/inbox")}>
                  <Inbox className="h-3.5 w-3.5" /> Go to Inbox
                </Button>
              </div>
              <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-4 max-w-sm text-left space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Building your Today list</p>
                <div className="space-y-1.5">
                  {[
                    "Capture tasks and ideas in your Inbox",
                    'Review AI decisions, then click "Send to Today"',
                    "Come back here to work through your daily focus",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/15 text-[9px] font-bold text-primary shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Returning user — inbox has items but none routed to Today */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <CalendarCheck className="h-12 w-12 text-muted-foreground/20 mb-1" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No items for today yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Route items from your Inbox to build today's focus list.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 mt-1" onClick={() => navigate("/app/inbox")}>
                <Inbox className="h-3.5 w-3.5" /> Open Inbox
              </Button>
            </div>
          )
        ) : orderedQueue.length === 0 && pinned.length > 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">All items are pinned as Top Focus.</p>
        ) : (
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedQueue.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedQueue.map((c) => (
                  <SortableTodayCard
                    key={c.id} capture={c} isPinSection={false}
                    onComplete={handleComplete} onDefer={handleDefer}
                    onTogglePin={togglePinToday} onEdit={startEdit}
                    editingId={editingId}
                    editState={{ editTitle, setEditTitle, editPriority, setEditPriority, editUrgency, setEditUrgency, editNextAction, setEditNextAction, editTags, setEditTags }}
                    onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── Completed Today ── */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 w-full text-left"
          >
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Today
            </h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{completed.length}</Badge>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform ${showCompleted ? "rotate-180" : ""}`} />
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completed.map((c) => {
                const ai = c.ai_data!;
                return (
                  <div key={c.id} className="rounded-lg border bg-card/60 px-4 py-3 flex items-center justify-between gap-3 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-through truncate">{ai.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{ai.next_action}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 gap-1 text-muted-foreground shrink-0" onClick={() => handleUncomplete(c.id)}>
                      <Undo2 className="h-3 w-3" /> Undo
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ── Sortable wrapper — adds drag handle to TodayCard ── */
function SortableTodayCard(props: TodayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.capture.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-1"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-[18px] p-1 text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TodayCard {...props} />
      </div>
    </div>
  );
}

/* ── Today Card Component ── */
interface TodayCardProps {
  capture: Capture;
  rank?: number;
  isPinSection: boolean;
  onComplete: (id: string) => void;
  onDefer: (id: string, dest: "processed" | "sent_to_someday" | "sent_to_projects", label: string) => void;
  onTogglePin: (id: string) => void;
  onEdit: (c: Capture) => void;
  editingId: string | null;
  editState: {
    editTitle: string; setEditTitle: (v: string) => void;
    editPriority: number; setEditPriority: (v: number) => void;
    editUrgency: UrgencyLevel; setEditUrgency: (v: UrgencyLevel) => void;
    editNextAction: string; setEditNextAction: (v: string) => void;
    editTags: string; setEditTags: (v: string) => void;
  };
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function TodayCard({
  capture, rank, isPinSection,
  onComplete, onDefer, onTogglePin, onEdit,
  editingId, editState, onSaveEdit, onCancelEdit,
}: TodayCardProps) {
  const ai = capture.ai_data!;
  const isEditing = editingId === capture.id;
  const [showDefer, setShowDefer] = useState(false);

  return (
    <div className={`rounded-xl border bg-card transition-all hover:shadow-sm ${isPinSection ? "border-[hsl(var(--brain-amber))]/30 shadow-sm" : ""}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            {rank != null && (
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[hsl(var(--brain-amber))]/15 text-xs font-bold text-[hsl(var(--brain-amber))] shrink-0 mt-0.5">
                {rank}
              </span>
            )}
            <div className="min-w-0">
              {!isEditing ? (
                <>
                  <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{ai.why_it_matters}</p>
                </>
              ) : (
                <div className="space-y-2 w-full">
                  <Input value={editState.editTitle} onChange={(e) => editState.setEditTitle(e.target.value)} className="h-8 text-sm font-semibold" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-[10px]">{categoryLabel[ai.category]}</Badge>
            <span className={`text-xs font-bold ${priorityColor(ai.priority_score)}`}>{ai.priority_score}/100</span>
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="space-y-3 rounded-lg bg-secondary/40 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Urgency</label>
                <select value={editState.editUrgency} onChange={(e) => editState.setEditUrgency(e.target.value as UrgencyLevel)}
                  className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                  {ALL_URGENCIES.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Priority ({editState.editPriority}/100)</label>
                <input type="range" min={1} max={100} value={editState.editPriority}
                  onChange={(e) => editState.setEditPriority(Number(e.target.value))}
                  className="w-full mt-2 accent-[hsl(var(--primary))]" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Next Action</label>
              <Input value={editState.editNextAction} onChange={(e) => editState.setEditNextAction(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Tags (comma separated)</label>
              <Input value={editState.editTags} onChange={(e) => editState.setEditTags(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onSaveEdit}><Check className="h-3 w-3" /> Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}><X className="h-3 w-3" /> Cancel</Button>
            </div>
          </div>
        )}

        {/* Meta row */}
        {!isEditing && (
          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            <span className={`font-medium ${urgencyColors[ai.urgency]}`}>
              <Gauge className="h-3 w-3 inline mr-1" />
              {ai.urgency.charAt(0).toUpperCase() + ai.urgency.slice(1)} urgency
            </span>
            {ai.due_date && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> Due: {ai.due_date}
              </span>
            )}
            {ai.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Source project indicator */}
        {!isEditing && capture.source_project_id && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <FolderKanban className="h-3 w-3" />
            <span>From project: <span className="font-medium text-foreground">{ai.suggested_project || "Linked project"}</span></span>
          </div>
        )}

        {/* Next action */}
        {!isEditing && ai.next_action && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <ArrowRight className="h-3 w-3" /> {ai.next_action}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onComplete(capture.id)}>
              <Check className="h-3 w-3" /> Done
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onTogglePin(capture.id)}>
              <Star className={`h-3 w-3 ${capture.is_pinned_today ? "fill-[hsl(var(--brain-amber))] text-[hsl(var(--brain-amber))]" : ""}`} />
              {capture.is_pinned_today ? "Unpin" : "Pin"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(capture)}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
            <div className="relative ml-auto">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setShowDefer(!showDefer)}>
                Defer <ChevronDown className={`h-3 w-3 transition-transform ${showDefer ? "rotate-180" : ""}`} />
              </Button>
              {showDefer && (
                <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border bg-card shadow-lg p-1 min-w-[160px]">
                  <button className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    onClick={() => { onDefer(capture.id, "processed", "Back to Inbox"); setShowDefer(false); }}>
                    <Inbox className="h-3.5 w-3.5" /> Back to Inbox
                  </button>
                  <button className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    onClick={() => { onDefer(capture.id, "sent_to_someday", "Moved to Someday"); setShowDefer(false); }}>
                    <Hourglass className="h-3.5 w-3.5" /> Someday
                  </button>
                  <button className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    onClick={() => { onDefer(capture.id, "sent_to_projects", "Moved to Projects"); setShowDefer(false); }}>
                    <FolderKanban className="h-3.5 w-3.5" /> Projects
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KPI({ icon, label, value, accent, highlight }: {
  icon: React.ReactNode; label: string; value: number | string; accent: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-2 transition-all ${highlight ? "ring-1 ring-primary/20 shadow-sm" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}
