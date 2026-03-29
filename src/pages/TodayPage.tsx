import { useBrain } from "@/context/BrainContext";
import CaptureCard from "@/components/CaptureCard";
import { AlertCircle, CheckSquare, Lightbulb } from "lucide-react";

export default function TodayPage() {
  const { captures } = useBrain();

  const actionable = captures
    .filter((c) => c.ai_data?.category === "task" || c.ai_data?.category === "reminder")
    .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0));

  const top3 = actionable.slice(0, 3);
  const rest = actionable.slice(3);
  const topIdea = captures.find((c) => c.ai_data?.category === "idea");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">Your top priorities, surfaced by AI.</p>
      </div>

      {/* Top 3 priorities */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-brain-teal" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Priorities</h2>
        </div>
        {top3.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No actionable items yet.</p>
        ) : (
          <div className="space-y-2">
            {top3.map((c, i) => (
              <div key={c.id} className="relative">
                <div className="absolute -left-6 top-4 text-xs font-bold text-muted-foreground/50">
                  {i + 1}
                </div>
                <CaptureCard capture={c} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Remaining actionable items */}
      {rest.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-brain-rose" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Also on your plate</h2>
          </div>
          <div className="space-y-2">
            {rest.map((c) => <CaptureCard key={c.id} capture={c} />)}
          </div>
        </section>
      )}

      {/* Idea to revisit */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brain-amber" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Idea to Revisit</h2>
        </div>
        {topIdea ? (
          <CaptureCard capture={topIdea} />
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No ideas captured yet.</p>
        )}
      </section>
    </div>
  );
}
