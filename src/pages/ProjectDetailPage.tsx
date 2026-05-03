/**
 * ProjectDetailPage — Full-screen dedicated page for a single project.
 * Route: /projects/:id
 *
 * Tabs: Overview · Actions · Captures · Timeline
 */

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/context/ProjectContext";
import { useBrain } from "@/context/BrainContext";
import { useMemory } from "@/context/MemoryContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, FolderKanban, Zap, CheckCircle2, Circle, Plus, Star,
  Rocket, Trash2, Clock, AlertTriangle, StickyNote, Lightbulb,
  Pencil, X, ChevronDown, ChevronUp, Brain, Pin, Heart,
  CalendarClock, BarChart3, Link2, Layers,
} from "lucide-react";
import CaptureCard from "@/components/CaptureCard";
import ProjectAIAssist from "@/components/projects/ProjectAIAssist";
import type { ProjectHealth, NextAction, ProjectStatus, ProjectPriority } from "@/types/project";

const HEALTH_CONFIG: Record<ProjectHealth, { label: string; className: string; icon: React.ElementType }> = {
  healthy: { label: "Healthy", className: "text-[hsl(var(--brain-teal))]", icon: Heart },
  at_risk: { label: "At Risk", className: "text-[hsl(var(--brain-amber))]", icon: AlertTriangle },
  stalled: { label: "Stalled", className: "text-[hsl(var(--brain-rose))]", icon: AlertTriangle },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-[hsl(var(--brain-rose))]",
  high: "text-[hsl(var(--brain-amber))]",
  medium: "text-muted-foreground",
  low: "text-muted-foreground/60",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Tab = "overview" | "actions" | "captures" | "timeline";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, getProjectHealth, updateProject, addNextAction, completeNextAction,
    setPrimaryAction, editNextAction, removeNextAction, markActionSentToToday, addNote, removeNote } = useProjects();
  const { captures, addCaptureFromAction } = useBrain();
  const { memories } = useMemory();

  const [tab, setTab] = useState<Tab>("overview");
  const [newActionText, setNewActionText] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editActionText, setEditActionText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showCompletedActions, setShowCompletedActions] = useState(false);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <FolderKanban className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const health = getProjectHealth(project);
  const healthCfg = HEALTH_CONFIG[health];
  const HealthIcon = healthCfg.icon;

  const activeActions = project.next_actions.filter((a) => !a.is_completed);
  const completedActions = project.next_actions.filter((a) => a.is_completed);

  const linkedCaptures = captures.filter((c) =>
    project.linked_capture_ids.includes(c.id) || c.ai_data?.suggested_project === project.name
  );
  const linkedTasks = linkedCaptures.filter((c) => c.ai_data?.category !== "idea" && c.ai_data?.category !== "maybe_later");
  const linkedIdeas = linkedCaptures.filter((c) => c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later");
  const sourceIdea = project.source_idea_id ? captures.find((c) => c.id === project.source_idea_id) : null;
  const linkedMemories = memories.filter((m) => !m.is_archived && m.linked_project_ids.includes(project.id));

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    addNextAction(project.id, newActionText.trim(), activeActions.length === 0);
    setNewActionText("");
    toast.success("Action added");
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addNote(project.id, newNoteText.trim());
    setNewNoteText("");
    toast.success("Note added");
  };

  const handleSendToToday = (a: NextAction) => {
    addCaptureFromAction({ text: a.text, projectId: project.id, projectName: project.name, actionId: a.id });
    markActionSentToToday(project.id, a.id);
    toast.success("Sent to Today");
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "actions", label: "Actions", icon: Zap, count: activeActions.length },
    { id: "captures", label: "Captures", icon: Link2, count: linkedCaptures.length },
    { id: "timeline", label: "Timeline", icon: Layers, count: project.timeline.length },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Projects
        </Button>
      </div>

      {/* ── Project header ── */}
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `hsl(var(${project.color}) / 0.12)` }}
        >
          <FolderKanban className="h-6 w-6" style={{ color: `hsl(var(${project.color}))` }} />
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2 max-w-xl">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-bold h-10"
              />
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="text-sm min-h-[60px]"
                placeholder="Project description..."
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={() => {
                  updateProject(project.id, { name: editName, description: editDesc });
                  setEditing(false);
                  toast.success("Project updated");
                }}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => {
                  setEditName(project.name); setEditDesc(project.description); setEditing(true);
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{project.description || "No description"}</p>
            </>
          )}
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
          <Select value={project.status} onValueChange={(v) => updateProject(project.id, { status: v as ProjectStatus })}>
            <SelectTrigger className="h-7 text-xs border-0 px-0 font-semibold justify-start gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
          <Select value={project.priority} onValueChange={(v) => updateProject(project.id, { priority: v as ProjectPriority })}>
            <SelectTrigger className={`h-7 text-xs border-0 px-0 font-semibold justify-start gap-1 ${PRIORITY_COLORS[project.priority]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Health</p>
          <div className={`flex items-center gap-1.5 ${healthCfg.className}`}>
            <HealthIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{healthCfg.label}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Progress</p>
          <div className="space-y-1">
            <p className="text-xs font-semibold">{project.progress}%</p>
            <Progress value={project.progress} className="h-1.5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Updated</p>
          <p className="text-xs font-semibold text-muted-foreground">{timeAgo(project.last_updated)}</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b pb-0 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-bold">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* AI assist */}
          <ProjectAIAssist project={project} />

          {/* Source idea */}
          {sourceIdea && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Created from idea</p>
                <p className="text-sm text-foreground mt-0.5">{sourceIdea.ai_data?.title || sourceIdea.raw_input.slice(0, 80)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Notes ({project.notes.length})
            </h2>
            {project.notes.map((n) => (
              <div key={n.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                <p className="text-sm flex-1 leading-relaxed">{n.text}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeNote(project.id, n.id)}>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="h-9 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
              />
              <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddNote} disabled={!newNoteText.trim()}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {/* Memories */}
          {linkedMemories.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" /> Linked Memories ({linkedMemories.length})
              </h2>
              <div className="space-y-2">
                {linkedMemories.map((m) => (
                  <div key={m.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                    {m.is_pinned ? <Pin className="h-4 w-4 text-[hsl(var(--brain-amber))] shrink-0" /> : <Brain className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      {m.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.summary}</p>}
                    </div>
                    <Badge variant="secondary" className="text-[9px] capitalize">{m.memory_type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className="space-y-4">
          {activeActions.length === 0 && (
            <div className="rounded-xl bg-[hsl(var(--brain-rose))/0.08] border border-[hsl(var(--brain-rose))/0.15] p-4 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--brain-rose))] shrink-0" />
              <p className="text-sm text-[hsl(var(--brain-rose))] font-medium">No next actions — add one to keep this project moving.</p>
            </div>
          )}

          <div className="space-y-2">
            {activeActions.map((a) => (
              <div key={a.id} className={`rounded-xl border p-4 flex items-center gap-3 ${a.is_primary ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
                <button
                  onClick={() => { completeNextAction(project.id, a.id); toast.success("Completed!"); }}
                  className="shrink-0"
                >
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  {editingAction === a.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editActionText}
                        onChange={(e) => setEditActionText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { editNextAction(project.id, a.id, editActionText); setEditingAction(null); }
                          if (e.key === "Escape") setEditingAction(null);
                        }}
                      />
                      <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => { editNextAction(project.id, a.id, editActionText); setEditingAction(null); }}>Save</Button>
                    </div>
                  ) : (
                    <p
                      className="text-sm cursor-pointer hover:text-primary transition-colors"
                      onClick={() => { setEditingAction(a.id); setEditActionText(a.text); }}
                    >
                      {a.text}
                    </p>
                  )}
                  {a.is_primary && (
                    <Badge variant="outline" className="text-[9px] text-primary border-primary/20 mt-1 gap-0.5">
                      <Star className="h-2.5 w-2.5" /> Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.is_primary && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Set as primary" onClick={() => { setPrimaryAction(project.id, a.id); toast("Set as primary"); }}>
                      <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {!a.sent_to_today ? (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Send to Today" onClick={() => handleSendToToday(a)}>
                      <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] gap-0.5"><Rocket className="h-2.5 w-2.5" />Today</Badge>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Delete" onClick={() => removeNextAction(project.id, a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add next action... (press Enter)"
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddAction(); }}
            />
            <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddAction} disabled={!newActionText.trim()}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {completedActions.length > 0 && (
            <div className="space-y-2 pt-2">
              <button
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                onClick={() => setShowCompletedActions(!showCompletedActions)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))]" />
                Completed ({completedActions.length})
                {showCompletedActions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showCompletedActions && (
                <div className="space-y-1.5 pl-2 border-l-2 border-border ml-1">
                  {completedActions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-3">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))] shrink-0" />
                      <span className="line-through truncate">{a.text}</span>
                      {a.completed_at && <span className="text-[10px] ml-auto shrink-0">{timeAgo(a.completed_at)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "captures" && (
        <div className="space-y-6">
          {/* Tasks */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tasks ({linkedTasks.length})
            </h2>
            {linkedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks linked to this project yet.</p>
            ) : (
              <div className="space-y-2">{linkedTasks.map((c) => <CaptureCard key={c.id} capture={c} />)}</div>
            )}
          </div>

          {/* Ideas */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Ideas ({linkedIdeas.length})
            </h2>
            {linkedIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No ideas linked to this project yet.</p>
            ) : (
              <div className="space-y-2">{linkedIdeas.map((c) => <CaptureCard key={c.id} capture={c} />)}</div>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-2 pl-3 border-l-2 border-border ml-1">
          {[...project.timeline].reverse().map((e) => (
            <div key={e.id} className="flex items-start gap-3 pl-4 -ml-[13px] relative">
              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{e.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(e.timestamp)}</p>
              </div>
            </div>
          ))}
          {project.timeline.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No events yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
