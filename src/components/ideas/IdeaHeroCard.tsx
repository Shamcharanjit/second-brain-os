import { Capture } from "@/types/brain";
import { useMemory } from "@/context/MemoryContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles, Rocket, FolderPlus, StickyNote, Archive,
  FolderOpen, ArrowRight, Eye, PauseCircle, Brain,
} from "lucide-react";

const effortLabels = { low: "Low Effort", medium: "Medium Effort", high: "High Effort" };
const effortColors = { low: "text-[hsl(var(--brain-teal))]", medium: "text-[hsl(var(--brain-amber))]", high: "text-[hsl(var(--brain-rose))]" };

const statusBadge: Record<string, { label: string; class: string }> = {
  new: { label: "New", class: "bg-[hsl(var(--brain-teal))/0.15] text-[hsl(var(--brain-teal))]" },
  explored: { label: "Explored", class: "bg-[hsl(var(--brain-blue))/0.15] text-[hsl(var(--brain-blue))]" },
  parked: { label: "Parked", class: "bg-muted text-muted-foreground" },
  converted_to_project: { label: "Converted", class: "bg-[hsl(var(--brain-purple))/0.15] text-[hsl(var(--brain-purple))]" },
};

interface Props {
  capture: Capture;
  onPromote: (id: string) => void;
  onArchive: (id: string) => void;
  onExplore: (id: string) => void;
  onPark: (id: string) => void;
  onConvert: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function IdeaHeroCard({ capture, onPromote, onArchive, onExplore, onPark, onConvert, onEdit }: Props) {
  const ai = capture.ai_data;
  if (!ai) return null;
  const { memories } = useMemory();
  const linkedMemories = memories.filter((m) => m.linked_idea_ids.includes(capture.id));
  const effort = { label: effortLabels[ai.effort], color: effortColors[ai.effort] };
  const badge = statusBadge[capture.idea_status] ?? statusBadge.new;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.class}`}>{badge.label}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{ai.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-lg font-bold ${ai.priority_score >= 65 ? "text-[hsl(var(--brain-teal))]" : ai.priority_score >= 45 ? "text-[hsl(var(--brain-amber))]" : "text-muted-foreground"}`}>
            {ai.priority_score}/100
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Potential</span>
        </div>
      </div>

      <div className="rounded-md bg-secondary/50 px-3 py-2">
        <p className="text-[11px] text-muted-foreground italic">"{capture.raw_input}"</p>
      </div>

      <div className="space-y-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Opportunity Insight</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ai.why_it_matters}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className={`font-medium ${effort.color}`}>{effort.label}</span>
          {ai.suggested_project && (
            <span className="text-muted-foreground flex items-center gap-1">
              <FolderOpen className="h-3 w-3" /> {ai.suggested_project}
            </span>
          )}
        </div>
        {ai.next_action && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-1">
            <ArrowRight className="h-3 w-3" />
            {ai.next_action}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ai.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Linked Memories */}
      {linkedMemories.length > 0 && (
        <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Linked Knowledge</span>
          </div>
          {linkedMemories.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground truncate">{m.title}</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">{m.memory_type}</Badge>
            </div>
          ))}
          {linkedMemories.length > 3 && (
            <p className="text-[10px] text-muted-foreground">+{linkedMemories.length - 3} more</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onPromote(capture.id)}>
          <Rocket className="h-3 w-3" /> Today
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onConvert(capture.id)}>
          <FolderPlus className="h-3 w-3" /> Project
        </Button>
        {capture.idea_status !== "explored" && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onExplore(capture.id)}>
            <Eye className="h-3 w-3" /> Explored
          </Button>
        )}
        {capture.idea_status !== "parked" && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onPark(capture.id)}>
            <PauseCircle className="h-3 w-3" /> Park
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(capture.id)}>
          <StickyNote className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto text-muted-foreground" onClick={() => onArchive(capture.id)}>
          <Archive className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
