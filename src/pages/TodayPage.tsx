import { useBrain } from "@/context/BrainContext";
import CaptureCard from "@/components/CaptureCard";
import { AlertCircle, CheckSquare, Lightbulb } from "lucide-react";

export default function TodayPage() {
  const { captures } = useBrain();

  const tasks = captures
    .filter((c) => c.ai_data?.category === "task")
    .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0))
    .slice(0, 5);

  const reminders = captures
    .filter((c) => c.ai_data?.category === "reminder")
    .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0))
    .slice(0, 3);

  const topIdea = captures.find((c) => c.ai_data?.category === "idea");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">Your priorities, surfaced by AI.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-brain-teal" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet.</p>
        ) : (
          <div className="space-y-2">{tasks.map((c) => <CaptureCard key={c.id} capture={c} />)}</div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-brain-rose" />
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Urgent Reminders</h2>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No reminders.</p>
        ) : (
          <div className="space-y-2">{reminders.map((c) => <CaptureCard key={c.id} capture={c} />)}</div>
        )}
      </section>

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
