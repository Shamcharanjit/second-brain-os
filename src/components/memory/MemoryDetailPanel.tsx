import { useState } from "react";
import { useMemory } from "@/context/MemoryContext";
import { useProjects } from "@/context/ProjectContext";
import { useBrain } from "@/context/BrainContext";
import { MemoryEntry, MemoryType } from "@/types/memory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Pin, PinOff, Archive, Pencil, X, Clock, FolderKanban, Lightbulb,
  Link2, BookOpen, Sparkles, Trash2, CalendarCheck,
} from "lucide-react";

const TYPE_LABELS: Record<MemoryType, string> = {
  note: "Note", insight: "Insight", decision: "Decision", reference: "Reference",
  learning: "Learning", quote: "Quote", research: "Research", sop: "SOP",
};

const TYPE_COLORS: Record<MemoryType, string> = {
  note: "bg-primary/10 text-primary",
  insight: "bg-[hsl(var(--brain-amber))/0.12] text-[hsl(var(--brain-amber))]",
  decision: "bg-[hsl(var(--brain-rose))/0.12] text-[hsl(var(--brain-rose))]",
  reference: "bg-[hsl(var(--brain-blue))/0.12] text-[hsl(var(--brain-blue))]",
  learning: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]",
  quote: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]",
  research: "bg-secondary text-secondary-foreground",
  sop: "bg-muted text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  memoryId: string;
  onClose: () => void;
}

export default function MemoryDetailPanel({ memoryId, onClose }: Props) {
  const { memories, updateMemory, togglePin, archiveMemory, markReviewed, linkProject, unlinkProject, linkIdea, unlinkIdea } = useMemory();
  const { projects } = useProjects();
  const { captures } = useBrain();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editRaw, setEditRaw] = useState("");
  const [editType, setEditType] = useState<MemoryType>("note");
  const [editTags, setEditTags] = useState("");
  const [editScore, setEditScore] = useState(50);
  const [linkingProject, setLinkingProject] = useState(false);
  const [linkingIdea, setLinkingIdea] = useState(false);

  const memory = memories.find((m) => m.id === memoryId);
  if (!memory) return null;

  const linkedProjects = projects.filter((p) => memory.linked_project_ids.includes(p.id));
  const linkedIdeaCaptures = captures.filter((c) => memory.linked_idea_ids.includes(c.id));
  const sourceCapture = memory.source_capture_id ? captures.find((c) => c.id === memory.source_capture_id) : null;
  const unlinkedProjects = projects.filter((p) => !memory.linked_project_ids.includes(p.id) && p.status !== "archived");
  const ideaCaptures = captures.filter((c) => c.status === "sent_to_ideas" && !memory.linked_idea_ids.includes(c.id) && c.idea_status !== "archived");

  const startEdit = () => {
    setEditTitle(memory.title); setEditSummary(memory.summary); setEditRaw(memory.raw_text);
    setEditType(memory.memory_type); setEditTags(memory.tags.join(", ")); setEditScore(memory.importance_score);
    setEditing(true);
  };

  const saveEdit = () => {
    updateMemory(memoryId, {
      title: editTitle, summary: editSummary, raw_text: editRaw, memory_type: editType,
      tags: editTags.split(",").map((t) => t.trim()).filter(Boolean), importance_score: editScore,
    });
    setEditing(false);
    toast.success("Memory updated");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--brain-purple))/0.12] flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-[hsl(var(--brain-purple))]" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="font-semibold" />
                  <div className="flex gap-2">
                    <Select value={editType} onValueChange={(v) => setEditType(v as MemoryType)}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Importance (1-100)" type="number" min={1} max={100} value={editScore} onChange={(e) => setEditScore(Number(e.target.value))} className="h-8 text-xs w-24" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg">{memory.title}</DialogTitle>
                    {memory.is_pinned && <Pin className="h-3.5 w-3.5 text-[hsl(var(--brain-amber))]" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge className={`text-[9px] ${TYPE_COLORS[memory.memory_type]}`}>{TYPE_LABELS[memory.memory_type]}</Badge>
                    <span className="text-[10px] text-muted-foreground">{memory.importance_score}/100</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Actions bar */}
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { togglePin(memoryId); toast(memory.is_pinned ? "Unpinned" : "Pinned"); }}>
              {memory.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              {memory.is_pinned ? "Unpin" : "Pin"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={editing ? saveEdit : startEdit}>
              <Pencil className="h-3 w-3" /> {editing ? "Save" : "Edit"}
            </Button>
            {editing && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { markReviewed(memoryId); toast.success("Marked reviewed"); }}>
              <Sparkles className="h-3 w-3" /> Mark Reviewed
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground ml-auto" onClick={() => { archiveMemory(memoryId); toast("Archived"); onClose(); }}>
              <Archive className="h-3 w-3" /> Archive
            </Button>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
            {editing ? (
              <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} className="text-sm min-h-[60px]" />
            ) : (
              <p className="text-sm leading-relaxed">{memory.summary}</p>
            )}
          </div>

          {/* Source text */}
          {(memory.raw_text !== memory.summary || editing) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Text</h3>
              {editing ? (
                <Textarea value={editRaw} onChange={(e) => setEditRaw(e.target.value)} className="text-xs min-h-[50px]" />
              ) : (
                <div className="rounded-lg bg-muted/50 border p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{memory.raw_text}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
            {editing ? (
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Comma-separated tags" className="text-xs h-8" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((t) => (
                  <span key={t} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">#{t}</span>
                ))}
                {memory.tags.length === 0 && <span className="text-[10px] text-muted-foreground">No tags</span>}
              </div>
            )}
          </div>

          {/* Source capture */}
          {sourceCapture && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source Capture</p>
              <p className="text-xs">{sourceCapture.ai_data?.title || sourceCapture.raw_input.slice(0, 80)}</p>
            </div>
          )}

          {/* Linked Projects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" /> Linked Projects ({linkedProjects.length})
              </h3>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setLinkingProject(!linkingProject)}>
                <Link2 className="h-3 w-3" /> Link
              </Button>
            </div>
            {linkedProjects.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5 shrink-0" style={{ color: `hsl(var(${p.color}))` }} />
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { unlinkProject(memoryId, p.id); toast("Unlinked"); }}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {linkingProject && unlinkedProjects.length > 0 && (
              <div className="space-y-1 rounded-lg border p-2">
                {unlinkedProjects.slice(0, 5).map((p) => (
                  <button key={p.id} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => { linkProject(memoryId, p.id); toast.success(`Linked to ${p.name}`); setLinkingProject(false); }}>
                    <FolderKanban className="h-3 w-3" style={{ color: `hsl(var(${p.color}))` }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked Ideas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Linked Ideas ({linkedIdeaCaptures.length})
              </h3>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setLinkingIdea(!linkingIdea)}>
                <Link2 className="h-3 w-3" /> Link
              </Button>
            </div>
            {linkedIdeaCaptures.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--brain-purple))] shrink-0" />
                <span className="text-xs font-medium flex-1 truncate">{c.ai_data?.title}</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { unlinkIdea(memoryId, c.id); toast("Unlinked"); }}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {linkingIdea && ideaCaptures.length > 0 && (
              <div className="space-y-1 rounded-lg border p-2">
                {ideaCaptures.slice(0, 5).map((c) => (
                  <button key={c.id} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => { linkIdea(memoryId, c.id); toast.success("Linked idea"); setLinkingIdea(false); }}>
                    <Lightbulb className="h-3 w-3 text-[hsl(var(--brain-purple))]" />
                    {c.ai_data?.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Created {timeAgo(memory.created_at)} · Updated {timeAgo(memory.updated_at)}
            {memory.last_reviewed_at && <> · Reviewed {timeAgo(memory.last_reviewed_at)}</>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
