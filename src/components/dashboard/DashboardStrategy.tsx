import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { useMemory } from "@/context/MemoryContext";
import { Lightbulb, Brain, ArrowRight, Pin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export default function DashboardStrategy() {
  const { captures } = useBrain();
  const { memories } = useMemory();
  const navigate = useNavigate();

  const topIdeas = useMemo(() =>
    captures.filter((c) => c.status === "sent_to_ideas" && c.idea_status !== "archived" && c.idea_status !== "converted_to_project")
      .sort((a, b) => (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0)).slice(0, 3),
    [captures]);

  const keyMemories = useMemo(() =>
    memories.filter((m) => !m.is_archived && (m.is_pinned || m.importance_score >= 70))
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || b.importance_score - a.importance_score).slice(0, 3),
    [memories]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Ideas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Ideas</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/ideas")}>Ideas Vault <ArrowRight className="h-3 w-3" /></Button>
        </div>
        {topIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border bg-card">No active ideas yet</p>
        ) : (
          <div className="space-y-2">
            {topIdeas.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/ideas")}>
                <Star className="h-4 w-4 text-[hsl(var(--brain-purple))] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.ai_data?.summary}</p>
                  <div className="flex gap-1 mt-1.5">
                    {c.ai_data?.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Memory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key Knowledge</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/memory")}>Memory Bank <ArrowRight className="h-3 w-3" /></Button>
        </div>
        {keyMemories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border bg-card">No memories saved yet</p>
        ) : (
          <div className="space-y-2">
            {keyMemories.map((m) => (
              <div key={m.id} className="rounded-lg border bg-card p-3 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/memory")}>
                {m.is_pinned ? <Pin className="h-4 w-4 text-[hsl(var(--brain-amber))] shrink-0 mt-0.5" /> : <Brain className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.summary}</p>
                  <div className="flex gap-1 mt-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{m.memory_type}</Badge>
                    {m.tags.slice(0, 1).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
