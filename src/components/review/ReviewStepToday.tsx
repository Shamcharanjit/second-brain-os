import { Capture } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Sparkles, Inbox, FolderKanban, Archive, PauseCircle, CalendarCheck,
} from "lucide-react";

interface Props {
  active: Capture[];
  completed: Capture[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  onMoveToProjects: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function ReviewStepToday({ active, completed, onComplete, onDefer, onMoveToProjects, onArchive }: Props) {
  const hasWork = active.length > 0 || completed.length > 0;

  if (!hasWork) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <CalendarCheck className="h-10 w-10 text-[hsl(var(--brain-teal))] mx-auto" />
        <p className="text-sm font-medium">Today is clear!</p>
        <p className="text-xs text-muted-foreground">No items to clean up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <>
          <div className="rounded-lg bg-[hsl(var(--brain-amber))/0.08] border border-[hsl(var(--brain-amber))/0.15] p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--brain-amber))] shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{active.length} unfinished item{active.length > 1 ? "s" : ""}</span> from Today. Complete, defer, or re-route them.
            </p>
          </div>

          <div className="space-y-2">
            {active.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium">{c.ai_data?.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] capitalize">{c.ai_data?.urgency}</Badge>
                    <span className="text-[9px] text-muted-foreground">{c.ai_data?.priority_score}/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onComplete(c.id)}>
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onDefer(c.id)}>
                    <PauseCircle className="h-3 w-3" /> Defer
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onMoveToProjects(c.id)}>
                    <FolderKanban className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onArchive(c.id)}>
                    <Archive className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed Today ({completed.length})</p>
          <div className="space-y-1">
            {completed.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))] shrink-0" />
                <span className="line-through truncate">{c.ai_data?.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
