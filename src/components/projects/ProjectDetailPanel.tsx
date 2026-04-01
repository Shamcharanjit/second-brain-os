import { useState } from "react";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { Project, ProjectHealth, NextAction } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FolderKanban, Zap, CheckCircle2, Circle, Plus, Star, Rocket, Trash2,
  Clock, AlertTriangle, Heart, PauseCircle, StickyNote, ArrowRight,
  ChevronDown, ChevronUp, Lightbulb, Pencil, X, Target, Shield,
} from "lucide-react";
import CaptureCard from "@/components/CaptureCard";

const HEALTH_CONFIG: Record<ProjectHealth, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "text-[hsl(var(--brain-teal))]" },
  at_risk: { label: "At Risk", className: "text-[hsl(var(--brain-amber))]" },
  stalled: { label: "Stalled", className: "text-[hsl(var(--brain-rose))]" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function ProjectDetailPanel({ projectId, onClose }: Props) {
  const { projects, getProjectHealth, updateProject, addNextAction, completeNextAction, setPrimaryAction, editNextAction, removeNextAction, markActionSentToToday, addNote, removeNote } = useProjects();
  const { captures, routeCapture } = useBrain();

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const health = getProjectHealth(project);
  const healthCfg = HEALTH_CONFIG[health];

  const [newActionText, setNewActionText] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editActionText, setEditActionText] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);

  const activeActions = project.next_actions.filter((a) => !a.is_completed);
  const completedActions = project.next_actions.filter((a) => a.is_completed);
  const primaryAction = activeActions.find((a) => a.is_primary);

  const linkedCaptures = captures.filter((c) =>
    project.linked_capture_ids.includes(c.id) || c.ai_data?.suggested_project === project.name
  );
  const linkedTasks = linkedCaptures.filter((c) => c.ai_data?.category !== "idea" && c.ai_data?.category !== "maybe_later");
  const linkedIdeas = linkedCaptures.filter((c) => c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later");

  const sourceIdea = project.source_idea_id ? captures.find((c) => c.id === project.source_idea_id) : null;

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    addNextAction(projectId, newActionText.trim(), activeActions.length === 0);
    setNewActionText("");
    toast.success("Action added");
  };

  const handleSendToToday = (action: NextAction) => {
    const existing = captures.find((c) => c.ai_data?.title === action.text && c.status === "sent_to_today");
    if (!existing) {
      // Create a capture routed to today
      const { addCapture } = useBrainDirect();
    }
    markActionSentToToday(projectId, action.id);
    toast.success("Sent to Today");
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addNote(projectId, newNoteText.trim());
    setNewNoteText("");
    toast.success("Note added");
  };

  const handleSaveEdit = () => {
    updateProject(projectId, { name: editName, description: editDesc });
    setEditing(false);
    toast.success("Project updated");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(var(${project.color}) / 0.12)` }}>
              <FolderKanban className="h-5 w-5" style={{ color: `hsl(var(${project.color}))` }} />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-lg font-semibold h-8" />
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="text-xs min-h-[40px]" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg">{project.name}</DialogTitle>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditName(project.name); setEditDesc(project.description); setEditing(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.description}</p>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Overview row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground">Status</span>
              <div>
                <Select value={project.status} onValueChange={(v) => updateProject(projectId, { status: v as any })}>
                  <SelectTrigger className="h-7 text-xs border-0 justify-center"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground">Priority</span>
              <div>
                <Select value={project.priority} onValueChange={(v) => updateProject(projectId, { priority: v as any })}>
                  <SelectTrigger className="h-7 text-xs border-0 justify-center"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground">Health</span>
              <p className={`text-xs font-semibold ${healthCfg.className}`}>{healthCfg.label}</p>
            </div>
            <div className="rounded-lg border p-3 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground">Progress</span>
              <p className="text-sm font-semibold">{project.progress}%</p>
            </div>
          </div>

          {/* Next Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" /> Next Actions ({activeActions.length})
              </h3>
            </div>

            {activeActions.length === 0 && (
              <div className="rounded-lg bg-[hsl(var(--brain-rose))/0.08] border border-[hsl(var(--brain-rose))/0.15] p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-rose))] shrink-0" />
                <p className="text-xs text-[hsl(var(--brain-rose))] font-medium">This project needs a next step to stay on track.</p>
              </div>
            )}

            <div className="space-y-1.5">
              {activeActions.map((a) => (
                <div key={a.id} className={`rounded-lg border p-3 flex items-center gap-2 ${a.is_primary ? "bg-primary/5 border-primary/15" : "bg-card"}`}>
                  <button onClick={() => { completeNextAction(projectId, a.id); toast.success("Action completed"); }}>
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingAction === a.id ? (
                      <div className="flex gap-1.5">
                        <Input value={editActionText} onChange={(e) => setEditActionText(e.target.value)} className="h-7 text-xs" autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") { editNextAction(projectId, a.id, editActionText); setEditingAction(null); } }} />
                        <Button size="sm" className="h-7 text-xs" onClick={() => { editNextAction(projectId, a.id, editActionText); setEditingAction(null); }}>Save</Button>
                      </div>
                    ) : (
                      <span className="text-sm cursor-pointer" onClick={() => { setEditingAction(a.id); setEditActionText(a.text); }}>{a.text}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.is_primary ? (
                      <Badge variant="outline" className="text-[9px] text-primary border-primary/20 gap-0.5"><Star className="h-2.5 w-2.5" />Primary</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPrimaryAction(projectId, a.id); toast("Set as primary"); }}>
                        <Star className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                    {!a.sent_to_today && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { markActionSentToToday(projectId, a.id); toast.success("Sent to Today"); }}>
                        <Rocket className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { removeNextAction(projectId, a.id); }}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Input placeholder="Add next action..." value={newActionText} onChange={(e) => setNewActionText(e.target.value)} className="h-8 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddAction(); }} />
              <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={handleAddAction} disabled={!newActionText.trim()}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>

            {completedActions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed ({completedActions.length})</p>
                {completedActions.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))] shrink-0" />
                    <span className="line-through truncate">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Tasks */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Linked Tasks ({linkedTasks.length})
            </h3>
            {linkedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No tasks linked yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedTasks.slice(0, 5).map((c) => <CaptureCard key={c.id} capture={c} />)}
              </div>
            )}
          </div>

          {/* Linked Ideas */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Linked Ideas ({linkedIdeas.length})
            </h3>
            {sourceIdea && (
              <div className="rounded-lg bg-[hsl(var(--brain-purple))/0.08] border border-[hsl(var(--brain-purple))/0.15] p-2.5 flex items-center gap-2 text-xs">
                <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--brain-purple))] shrink-0" />
                <span className="text-muted-foreground">Originated from idea: <span className="font-medium text-foreground">{sourceIdea.ai_data?.title}</span></span>
              </div>
            )}
            {linkedIdeas.length === 0 && !sourceIdea ? (
              <p className="text-xs text-muted-foreground py-2">No ideas linked yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedIdeas.slice(0, 3).map((c) => <CaptureCard key={c.id} capture={c} />)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Notes ({project.notes.length})
            </h3>
            {project.notes.map((n) => (
              <div key={n.id} className="rounded-lg border bg-card p-3 flex items-start gap-2">
                <p className="text-xs flex-1">{n.text}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeNote(projectId, n.id)}>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-1.5">
              <Input placeholder="Add a note..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} className="h-8 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }} />
              <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={handleAddNote} disabled={!newNoteText.trim()}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <button className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => setShowTimeline(!showTimeline)}>
              <Clock className="h-3.5 w-3.5" /> Timeline ({project.timeline.length})
              {showTimeline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTimeline && (
              <div className="space-y-1.5 pl-2 border-l-2 border-border ml-1">
                {[...project.timeline].reverse().slice(0, 10).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 -ml-[19px]" />
                    <span>{e.description}</span>
                    <span className="text-[10px] ml-auto shrink-0">{timeAgo(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer meta */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Created {timeAgo(project.created_at)} · Last updated {timeAgo(project.last_updated)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
