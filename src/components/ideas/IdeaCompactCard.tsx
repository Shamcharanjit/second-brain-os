import { Capture } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Rocket, Archive, Eye, FolderPlus, PauseCircle } from "lucide-react";

const statusDot: Record<string, string> = {
  new: "bg-[hsl(var(--brain-teal))]",
  explored: "bg-[hsl(var(--brain-blue))]",
  parked: "bg-muted-foreground",
  converted_to_project: "bg-[hsl(var(--brain-purple))]",
};

interface Props {
  capture: Capture;
  onPromote: (id: string) => void;
  onArchive: (id: string) => void;
  onExplore: (id: string) => void;
  onPark: (id: string) => void;
  onConvert: (id: string) => void;
}

export default function IdeaCompactCard({ capture, onPromote, onArchive, onExplore, onPark, onConvert }: Props) {
  const ai = capture.ai_data;
  if (!ai) return null;
  const dot = statusDot[capture.idea_status] ?? statusDot.new;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2.5 hover:border-primary/20 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
          <h3 className="text-sm font-medium leading-snug truncate">{ai.title}</h3>
        </div>
        <span className={`text-xs font-bold shrink-0 ${ai.priority_score >= 65 ? "text-[hsl(var(--brain-teal))]" : "text-muted-foreground"}`}>
          {ai.priority_score}/100
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{ai.summary}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ai.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1 flex-wrap">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onPromote(capture.id)}>
          <Rocket className="h-2.5 w-2.5" /> Today
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onConvert(capture.id)}>
          <FolderPlus className="h-2.5 w-2.5" /> Project
        </Button>
        {capture.idea_status === "new" && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onExplore(capture.id)}>
            <Eye className="h-2.5 w-2.5" />
          </Button>
        )}
        {capture.idea_status !== "parked" && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onPark(capture.id)}>
            <PauseCircle className="h-2.5 w-2.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 ml-auto text-muted-foreground" onClick={() => onArchive(capture.id)}>
          <Archive className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
