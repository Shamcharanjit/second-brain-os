import { Capture, CaptureCategory } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Mic, Type } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const categoryColors: Record<CaptureCategory, string> = {
  task: "bg-brain-teal/15 text-brain-teal",
  idea: "bg-brain-amber/15 text-brain-amber",
  reminder: "bg-brain-rose/15 text-brain-rose",
  project_note: "bg-brain-blue/15 text-brain-blue",
  follow_up: "bg-brain-purple/15 text-brain-purple",
  maybe_later: "bg-muted text-muted-foreground",
};

export default function CaptureCard({ capture }: { capture: Capture }) {
  const ai = capture.ai_data;
  if (!ai) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2 transition-colors hover:border-primary/20">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{ai.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {capture.input_type === "voice" ? (
            <Mic className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Type className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[ai.category]}`}>
            {ai.category.replace("_", " ")}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{ai.summary}</p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {ai.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>
      {ai.next_action && (
        <div className="text-xs text-primary font-medium pt-1">→ {ai.next_action}</div>
      )}
    </div>
  );
}
