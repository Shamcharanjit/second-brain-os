import { useMemory } from "@/context/MemoryContext";
import { useProjects } from "@/context/ProjectContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Brain, Sparkles, Pin, PinOff, Archive, CheckCircle2, FolderKanban,
  BookOpen, Clock, AlertTriangle,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  note: "Note", insight: "Insight", decision: "Decision", reference: "Reference",
  learning: "Learning", quote: "Quote", research: "Research", sop: "SOP",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReviewStepMemory() {
  const { memories, togglePin, archiveMemory, markReviewed } = useMemory();
  const { projects } = useProjects();

  const active = memories.filter((m) => !m.is_archived);
  const unreviewed = active.filter((m) => !m.last_reviewed_at);
  const pinned = active.filter((m) => m.is_pinned);
  const highImportance = active.filter((m) => m.importance_score >= 70 && !m.last_reviewed_at);
  const projectLinked = active.filter((m) => m.linked_project_ids.length > 0);

  const reviewable = [...new Map([...unreviewed, ...highImportance, ...pinned].map((m) => [m.id, m])).values()].slice(0, 8);

  if (active.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-medium">No memories saved yet.</p>
        <p className="text-xs text-muted-foreground">Save knowledge, decisions, and references to build your second brain.</p>
      </div>
    );
  }

  const insight = unreviewed.length > 3
    ? `${unreviewed.length} memories haven't been reviewed yet. Knowledge compounds when revisited.`
    : highImportance.length > 0
    ? `${highImportance.length} high-importance item${highImportance.length > 1 ? "s" : ""} worth revisiting this week.`
    : `${active.length} memories saved. ${projectLinked.length} linked to active projects.`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[hsl(var(--brain-purple))/0.08] border border-[hsl(var(--brain-purple))/0.15] p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--brain-purple))] shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">{insight}</p>
      </div>

      <div className="space-y-2">
        {reviewable.map((m) => {
          const linkedNames = projects.filter((p) => m.linked_project_ids.includes(p.id)).map((p) => p.name);

          return (
            <div key={m.id} className={`rounded-xl border bg-card p-4 space-y-2 ${m.is_pinned ? "border-[hsl(var(--brain-amber))/0.3]" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brain-purple))/0.12] flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    {m.is_pinned && <Pin className="h-3 w-3 text-[hsl(var(--brain-amber))] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{m.summary}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[m.memory_type] || m.memory_type}</Badge>
                    <span className="text-[9px] text-muted-foreground">{m.importance_score}/100</span>
                    {linkedNames.length > 0 && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <FolderKanban className="h-2.5 w-2.5" /> {linkedNames[0]}
                      </span>
                    )}
                    {!m.last_reviewed_at && (
                      <Badge variant="outline" className="text-[9px] text-[hsl(var(--brain-amber))] gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> Unreviewed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pl-11">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { markReviewed(m.id); toast.success("Marked reviewed"); }}>
                  <CheckCircle2 className="h-3 w-3" /> Reviewed
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { togglePin(m.id); toast(m.is_pinned ? "Unpinned" : "Pinned"); }}>
                  {m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  {m.is_pinned ? "Unpin" : "Pin"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground ml-auto" onClick={() => { archiveMemory(m.id); toast("Archived"); }}>
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
