/**
 * GoalsPage — Long-term goals tracker with milestones and life areas.
 */

import { useState, useMemo } from "react";
import { useGoals } from "@/context/GoalContext";
import { Goal, LifeArea, GoalStatus, LIFE_AREA_CONFIG } from "@/types/goal";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  Plus, Target, CheckCircle2, Circle, Trash2, ChevronDown, ChevronRight,
  CalendarClock, TrendingUp, X, Edit2, Check,
} from "lucide-react";

const STATUS_CONFIG: Record<GoalStatus, { label: string; className: string }> = {
  active:    { label: "Active",    className: "bg-primary/10 text-primary" },
  completed: { label: "Completed", className: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]" },
  paused:    { label: "Paused",    className: "bg-[hsl(var(--brain-amber))/0.12] text-[hsl(var(--brain-amber))]" },
  archived:  { label: "Archived",  className: "bg-muted text-muted-foreground" },
};

// ── Create Goal Dialog ─────────────────────────────────────────────────────────
function CreateGoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createGoal } = useGoals();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<LifeArea>("personal");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    setSubmitting(true);
    createGoal(title.trim(), area, description.trim() || undefined, targetDate || null);
    toast.success("Goal created!");
    setTitle(""); setArea("personal"); setDescription(""); setTargetDate("");
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Goal Title *</label>
            <Input
              placeholder="e.g. Run a half marathon by December"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Life Area</label>
            <Select value={area} onValueChange={(v) => setArea(v as LifeArea)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LIFE_AREA_CONFIG) as [LifeArea, typeof LIFE_AREA_CONFIG[LifeArea]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.emoji} {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              placeholder="Why does this goal matter to you?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Target Date (optional)</label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || submitting}>
              Create Goal
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal }: { goal: Goal }) {
  const { getGoalProgress, addMilestone, toggleMilestone, removeMilestone, updateGoal, deleteGoal } = useGoals();
  const [expanded, setExpanded] = useState(false);
  const [newMilestone, setNewMilestone] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title);

  const progress = getGoalProgress(goal);
  const cfg = LIFE_AREA_CONFIG[goal.life_area];
  const statusCfg = STATUS_CONFIG[goal.status];

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    addMilestone(goal.id, newMilestone.trim());
    setNewMilestone("");
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim()) updateGoal(goal.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const pendingCount = goal.milestones.filter((m) => !m.is_completed).length;
  const doneCount = goal.milestones.filter((m) => m.is_completed).length;

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-sm transition-shadow">
      {/* Color band */}
      <div className="h-1" style={{ background: `hsl(var(${cfg.color}))` }} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5 shrink-0">{cfg.emoji}</span>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex gap-1.5">
                <Input
                  className="h-7 text-sm font-semibold"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  autoFocus
                />
                <Button size="sm" className="h-7 px-2" onClick={handleSaveTitle}><Check className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingTitle(false)}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <h3 className={`font-semibold text-sm leading-snug ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {goal.title}
                </h3>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() => { setTitleDraft(goal.title); setEditingTitle(true); }}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-transparent ${statusCfg.className}`}>
                {statusCfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
              {goal.target_date && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CalendarClock className="h-2.5 w-2.5" />
                  {format(new Date(goal.target_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Status toggle */}
            <Select
              value={goal.status}
              onValueChange={(v) => updateGoal(goal.id, { status: v as GoalStatus })}
            >
              <SelectTrigger className="h-6 w-auto text-[10px] border-none shadow-none px-1.5 gap-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_CONFIG) as [GoalStatus, typeof STATUS_CONFIG[GoalStatus]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              onClick={() => { deleteGoal(goal.id); toast.success("Goal archived"); }}
              title="Archive goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {goal.milestones.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{doneCount}/{goal.milestones.length} milestones</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Description */}
        {goal.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{goal.description}</p>
        )}

        {/* Expand milestones */}
        <button
          className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
          onClick={() => setExpanded((o) => !o)}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {pendingCount > 0 ? `${pendingCount} milestone${pendingCount !== 1 ? "s" : ""} remaining` : goal.milestones.length === 0 ? "Add milestones" : "All done!"}
        </button>

        {expanded && (
          <div className="space-y-2 pl-1">
            {goal.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleMilestone(goal.id, m.id)} className="shrink-0">
                  {m.is_completed
                    ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
                    : <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors" />
                  }
                </button>
                <span className={`text-xs flex-1 leading-snug ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {m.text}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => removeMilestone(goal.id, m.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {/* Add milestone input */}
            <div className="flex gap-1.5 mt-1">
              <Input
                className="h-7 text-xs"
                placeholder="Add a milestone…"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
              />
              <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleAddMilestone} disabled={!newMilestone.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type FilterArea = "all" | LifeArea;
type FilterStatus = "active" | "completed" | "all";

export default function GoalsPage() {
  const { goals } = useGoals();
  const [showCreate, setShowCreate] = useState(false);
  const [filterArea, setFilterArea] = useState<FilterArea>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");

  const active = goals.filter((g) => g.status !== "archived");

  const filtered = useMemo(() => {
    let list = active;
    if (filterStatus === "active") list = list.filter((g) => g.status === "active" || g.status === "paused");
    else if (filterStatus === "completed") list = list.filter((g) => g.status === "completed");
    if (filterArea !== "all") list = list.filter((g) => g.life_area === filterArea);
    return list.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  }, [active, filterArea, filterStatus]);

  const stats = useMemo(() => ({
    total: active.length,
    active: active.filter((g) => g.status === "active").length,
    completed: active.filter((g) => g.status === "completed").length,
    areas: new Set(active.map((g) => g.life_area)).size,
  }), [active]);

  const areaOptions: { key: FilterArea; label: string }[] = [
    { key: "all", label: "All Areas" },
    ...Object.entries(LIFE_AREA_CONFIG).map(([k, v]) => ({ key: k as LifeArea, label: `${v.emoji} ${v.label}` })),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">Long-term goals with milestones across every life area.</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Goal
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,     icon: Target,       color: "text-primary" },
          { label: "Active",    value: stats.active,    icon: TrendingUp,   color: "text-[hsl(var(--brain-blue))]" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-[hsl(var(--brain-teal))]" },
          { label: "Life Areas",value: stats.areas,     icon: Target,       color: "text-[hsl(var(--brain-purple))]" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex gap-1.5">
          {(["active", "completed", "all"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                filterStatus === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s === "active" ? "Active" : s === "completed" ? "Completed" : "All"}
            </button>
          ))}
        </div>

        {/* Area filter */}
        <Select value={filterArea} onValueChange={(v) => setFilterArea(v as FilterArea)}>
          <SelectTrigger className="h-8 text-xs w-full sm:w-48 sm:ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areaOptions.map((o) => (
              <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Goal cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center space-y-4">
          <Target className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {goals.length === 0 ? "No goals yet" : "No goals match this filter"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {goals.length === 0
                ? "Set your first long-term goal to start tracking what matters most."
                : "Try adjusting your filter or life area."}
            </p>
          </div>
          {goals.length === 0 && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" /> Create your first goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      <CreateGoalDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
