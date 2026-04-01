import { Capture } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Sparkles, CheckCircle2, CalendarCheck, Lightbulb, Tag, Mic, MessageSquare,
} from "lucide-react";

interface Props {
  items: Capture[];
  onRouteToday: (id: string) => void;
  onRouteIdeas: (id: string) => void;
}

export default function ReviewStepMemory({ items, onRouteToday, onRouteIdeas }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-medium">Nothing to resurface.</p>
        <p className="text-xs text-muted-foreground">Your recent captures are well-organized.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          These recent notes and knowledge items might deserve a closer look or action.
        </p>
      </div>

      <div className="space-y-2">
        {items.slice(0, 5).map((c) => (
          <div key={c.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {c.input_type === "voice" ? <Mic className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium truncate">{c.ai_data?.title || c.raw_input.slice(0, 60)}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{c.raw_input}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[9px] capitalize">{c.ai_data?.category?.replace("_", " ")}</Badge>
                {c.ai_data?.tags?.slice(0, 2).map((t) => (
                  <span key={t} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{t}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteToday(c.id)}>
                <CalendarCheck className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRouteIdeas(c.id)}>
                <Lightbulb className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
