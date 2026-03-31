import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Inbox, CalendarCheck, Lightbulb, ArrowRight, BrainCircuit, Sparkles, ShieldQuestion } from "lucide-react";
import CaptureInput from "@/components/CaptureInput";
import CaptureCard from "@/components/CaptureCard";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { captures } = useBrain();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const unprocessed = captures.filter((c) => c.status === "unprocessed");
    const todayTasks = captures.filter(
      (c) =>
        c.status !== "archived" &&
        (c.status === "sent_to_today" || c.ai_data?.category === "task" || c.ai_data?.category === "reminder")
    );
    const ideas = captures.filter(
      (c) =>
        c.status !== "archived" &&
        (c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later")
    );
    return { total: captures.length, unprocessed: unprocessed.length, todayTasks: todayTasks.length, ideas: ideas.length };
  }, [captures]);

  const topPriorities = useMemo(() => {
    return captures
      .filter(
        (c) =>
          c.status !== "archived" &&
          c.status !== "sent_to_ideas" &&
          (c.ai_data?.category === "task" || c.ai_data?.category === "reminder")
      )
      .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0))
      .slice(0, 3);
  }, [captures]);

  const unprocessedRecent = useMemo(() => {
    return captures.filter((c) => c.status === "unprocessed").slice(0, 3);
  }, [captures]);

  const ideasToRevisit = useMemo(() => {
    return captures
      .filter(
        (c) =>
          c.status !== "archived" &&
          (c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later")
      )
      .slice(0, 3);
  }, [captures]);

  const statCards = [
    { label: "Total Captures", value: stats.total, icon: Brain, color: "text-primary" },
    { label: "Unprocessed", value: stats.unprocessed, icon: Inbox, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Today Tasks", value: stats.todayTasks, icon: CalendarCheck, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Ideas Stored", value: stats.ideas, icon: Lightbulb, color: "text-[hsl(var(--brain-purple))]" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Capture fast, see what matters, never lose ideas.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Capture Thought */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capture Thought</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">Type or speak anything. AI will organize it for you.</p>
        <CaptureInput />
      </section>

      {/* Today Focus */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today Focus</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/today")}>
            Open Today <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {topPriorities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No priorities yet.</p>
        ) : (
          <div className="space-y-2">
            {topPriorities.map((c) => (
              <CaptureCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </section>

      {/* Inbox Needs Review */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Inbox Needs Review
              {stats.unprocessed > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[hsl(var(--brain-amber))/0.15] text-[hsl(var(--brain-amber))] text-[10px] font-bold px-1.5 py-0.5">
                  {stats.unprocessed}
                </span>
              )}
            </h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/inbox")}>
            Review Inbox <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {unprocessedRecent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">All caught up!</p>
        ) : (
          <div className="space-y-2">
            {unprocessedRecent.map((c) => (
              <CaptureCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </section>

      {/* Ideas Worth Revisiting */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ideas Worth Revisiting</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/ideas")}>
            Open Ideas Vault <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {ideasToRevisit.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No ideas captured yet.</p>
        ) : (
          <div className="space-y-2">
            {ideasToRevisit.map((c) => (
              <CaptureCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
