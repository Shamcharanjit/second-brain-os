import { Capture } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Inbox, CheckCircle2, Rocket, Lightbulb, FolderKanban, Archive, Sparkles, Brain,
} from "lucide-react";

interface Props {
  items: Capture[];
  onApprove: (id: string) => void;
  onRouteToday: (id: string) => void;
  onRouteIdeas: (id: string) => void;
  onRouteProjects: (id: string) => void;
  onRouteMemory: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function ReviewStepInbox({ items, onApprove, onRouteToday, onRouteIdeas, onRouteProjects, onRouteMemory, onArchive }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <CheckCircle2 className="h-10 w-10 text-[hsl(var(--brain-teal))] mx-auto" />
        <p className="text-sm font-medium">Inbox is clear!</p>
        <p className="text-xs text-muted-foreground">No pending items to review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          You have <span className="font-semibold text-foreground">{items.length} item{items.length > 1 ? "s" : ""}</span> waiting for a decision. Approve, route, or archive each one.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((c) => {
          const ai = c.ai_data;
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brain-amber))/0.12] flex items-center justify-center shrink-0">
                  <Inbox className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium">{ai?.title || c.raw_input.slice(0, 60)}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{ai?.summary || c.raw_input}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] capitalize">{ai?.category?.replace("_", " ")}</Badge>
                    {ai?.urgency === "high" && <Badge variant="destructive" className="text-[9px]">Urgent</Badge>}
                    <span className="text-[9px] text-muted-foreground">{ai?.priority_score}/100</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onApprove(c.id)}>
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteToday(c.id)}>
                  <Rocket className="h-3 w-3" /> Today
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteIdeas(c.id)}>
                  <Lightbulb className="h-3 w-3" /> Ideas
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteProjects(c.id)}>
                  <FolderKanban className="h-3 w-3" /> Projects
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteMemory(c.id)}>
                  <Brain className="h-3 w-3" /> Memory
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 ml-auto text-muted-foreground" onClick={() => onArchive(c.id)}>
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
