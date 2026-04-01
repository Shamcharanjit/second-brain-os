import { Capture } from "@/types/brain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, Sparkles, CheckCircle2, Rocket, FolderPlus, Eye, Archive,
} from "lucide-react";

interface Props {
  newIdeas: Capture[];
  highPotential: Capture[];
  parked: Capture[];
  onExplore: (id: string) => void;
  onConvert: (id: string) => void;
  onPromote: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function ReviewStepIdeas({ newIdeas, highPotential, parked, onExplore, onConvert, onPromote, onArchive }: Props) {
  const total = newIdeas.length + highPotential.length + parked.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-medium">No ideas to review.</p>
        <p className="text-xs text-muted-foreground">Capture some creative thoughts to fill the vault.</p>
      </div>
    );
  }

  const insight = newIdeas.length > 2
    ? `${newIdeas.length} new ideas haven't been explored yet. Consider promoting the strongest ones.`
    : highPotential.length > 0
    ? `${highPotential.length} high-potential idea${highPotential.length > 1 ? "s" : ""} worth revisiting this week.`
    : `${parked.length} parked idea${parked.length > 1 ? "s" : ""} — check if any deserve a second look.`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[hsl(var(--brain-purple))/0.08] border border-[hsl(var(--brain-purple))/0.15] p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--brain-purple))] shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">{insight}</p>
      </div>

      {[
        { label: "New Ideas", items: newIdeas, color: "text-[hsl(var(--brain-teal))]" },
        { label: "High Potential", items: highPotential, color: "text-[hsl(var(--brain-amber))]" },
        { label: "Parked", items: parked.slice(0, 3), color: "text-muted-foreground" },
      ].filter((g) => g.items.length > 0).map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label} ({group.items.length})</p>
          {group.items.slice(0, 4).map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                  <span className={`text-xs font-bold ${(c.ai_data?.priority_score ?? 0) >= 65 ? "text-[hsl(var(--brain-teal))]" : "text-muted-foreground"}`}>
                    {c.ai_data?.priority_score}/100
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{c.ai_data?.summary}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {c.idea_status === "new" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onExplore(c.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onPromote(c.id)}>
                  <Rocket className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onConvert(c.id)}>
                  <FolderPlus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onArchive(c.id)}>
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
