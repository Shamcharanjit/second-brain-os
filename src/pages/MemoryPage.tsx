import { useState, useMemo, useEffect } from "react";
import {
  Search, Brain, Plus, Pin, Clock, FolderKanban, Lightbulb,
  BookOpen, Archive, Sparkles, Star, CheckCircle2, Tag, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemory } from "@/context/MemoryContext";
import { useProjects } from "@/context/ProjectContext";
import { MemoryEntry, MemoryType } from "@/types/memory";
import { toast } from "sonner";
import MemoryDetailPanel from "@/components/memory/MemoryDetailPanel";
import CreateMemoryDialog from "@/components/memory/CreateMemoryDialog";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";

const TYPE_LABELS: Record<MemoryType, string> = {
  note: "Note", insight: "Insight", decision: "Decision", reference: "Reference",
  learning: "Learning", quote: "Quote", research: "Research", sop: "SOP",
};

const TYPE_COLORS: Record<MemoryType, string> = {
  note: "bg-primary/10 text-primary",
  insight: "bg-[hsl(var(--brain-amber))/0.12] text-[hsl(var(--brain-amber))]",
  decision: "bg-[hsl(var(--brain-rose))/0.12] text-[hsl(var(--brain-rose))]",
  reference: "bg-[hsl(var(--brain-blue))/0.12] text-[hsl(var(--brain-blue))]",
  learning: "bg-[hsl(var(--brain-teal))/0.12] text-[hsl(var(--brain-teal))]",
  quote: "bg-[hsl(var(--brain-purple))/0.12] text-[hsl(var(--brain-purple))]",
  research: "bg-secondary text-secondary-foreground",
  sop: "bg-muted text-muted-foreground",
};

type FilterTab = "all" | "pinned" | "recent" | "project" | "unreviewed" | "archived";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MemoryPage() {
  const { memories, togglePin, archiveMemory, markReviewed } = useMemory();
  const { projects } = useProjects();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [aiSearchMode, setAiSearchMode] = useState(false);

  // Semantic / AI search
  const { results: semanticResults, loading: semanticLoading, search: semanticSearch, clear: clearSemantic } = useSemanticSearch();

  // Debounce AI search as user types
  useEffect(() => {
    if (!aiSearchMode) { clearSemantic(); return; }
    if (!search.trim()) { clearSemantic(); return; }
    const timer = setTimeout(() => { semanticSearch(search); }, 500);
    return () => clearTimeout(timer);
  }, [search, aiSearchMode, semanticSearch, clearSemantic]);

  const active = useMemo(() => memories.filter((m) => !m.is_archived), [memories]);

  const stats = useMemo(() => ({
    total: active.length,
    pinned: active.filter((m) => m.is_pinned).length,
    recent: active.filter((m) => (Date.now() - new Date(m.created_at).getTime()) < 7 * 86400000).length,
    projectLinked: active.filter((m) => m.linked_project_ids.length > 0).length,
    unreviewed: active.filter((m) => !m.last_reviewed_at).length,
  }), [active]);

  const filtered = useMemo(() => {
    let list = memories;

    if (filter === "pinned") list = list.filter((m) => m.is_pinned && !m.is_archived);
    else if (filter === "recent") list = list.filter((m) => !m.is_archived && (Date.now() - new Date(m.created_at).getTime()) < 7 * 86400000);
    else if (filter === "project") list = list.filter((m) => !m.is_archived && m.linked_project_ids.length > 0);
    else if (filter === "unreviewed") list = list.filter((m) => !m.is_archived && !m.last_reviewed_at);
    else if (filter === "archived") list = list.filter((m) => m.is_archived);
    else list = list.filter((m) => !m.is_archived);

    if (typeFilter !== "all") list = list.filter((m) => m.memory_type === typeFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return b.importance_score - a.importance_score;
    });
  }, [memories, filter, typeFilter, search]);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: active.length },
    { key: "pinned", label: "Pinned", count: stats.pinned },
    { key: "recent", label: "Recent", count: stats.recent },
    { key: "project", label: "Project-Linked", count: stats.projectLinked },
    { key: "unreviewed", label: "Unreviewed", count: stats.unreviewed },
    { key: "archived", label: "Archived", count: memories.filter((m) => m.is_archived).length },
  ];

  const kpiCards = [
    { label: "Total Memories", value: stats.total, icon: Brain, color: "text-[hsl(var(--brain-purple))]" },
    { label: "Pinned", value: stats.pinned, icon: Pin, color: "text-[hsl(var(--brain-amber))]" },
    { label: "This Week", value: stats.recent, icon: Clock, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Project-Linked", value: stats.projectLinked, icon: FolderKanban, color: "text-[hsl(var(--brain-blue))]" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">Your knowledge bank. Decisions, insights, and references that compound.</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Save Memory
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-sm font-medium text-foreground italic">"Knowledge is only powerful when it's findable."</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Your second brain, curated.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterTabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all shrink-0 ${
                filter === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 sm:ml-auto">
          {/* AI search toggle */}
          <button
            onClick={() => { setAiSearchMode((v) => !v); clearSemantic(); }}
            title={aiSearchMode ? "Switch to keyword search" : "Switch to AI semantic search"}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 ${
              aiSearchMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Zap className="h-3 w-3" />
            {aiSearchMode ? "AI" : "AI"}
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={aiSearchMode ? "Ask anything…" : "Search memories..."}
              className="pl-8 h-8 text-xs w-full sm:w-52"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* AI Search Results */}
      {aiSearchMode && search.trim() && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">AI Search Results</h2>
            {semanticLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            {!semanticLoading && semanticResults.length > 0 && (
              <span className="text-xs text-muted-foreground">{semanticResults.length} found by meaning</span>
            )}
          </div>
          {!semanticLoading && semanticResults.length === 0 && search.trim().length >= 3 && (
            <p className="text-xs text-muted-foreground py-2">
              No semantically similar memories found. Try different wording, or switch off AI search for keyword matching.
            </p>
          )}
          {semanticResults.map((r) => {
            const mem = memories.find((m) => m.id === r.id);
            if (!mem) return null;
            return (
              <div key={r.id} className="relative">
                <div className="absolute -top-1.5 right-3 z-10">
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] text-primary font-medium">
                    {Math.round(r.similarity * 100)}% match
                  </span>
                </div>
                <MemoryCard memory={mem} projects={projects} onOpen={() => setSelectedId(mem.id)}
                  onPin={() => { togglePin(mem.id); toast(mem.is_pinned ? "Unpinned" : "Pinned"); }} />
              </div>
            );
          })}
        </section>
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setTypeFilter("all")}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-all ${typeFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}>
          All Types
        </button>
        {(Object.keys(TYPE_LABELS) as MemoryType[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-all ${typeFilter === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Pinned Memories */}
      {filter === "all" && stats.pinned > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pinned Knowledge</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {active.filter((m) => m.is_pinned).slice(0, 4).map((m) => (
              <MemoryCard key={m.id} memory={m} projects={projects} onOpen={() => setSelectedId(m.id)} onPin={() => { togglePin(m.id); toast("Unpinned"); }} />
            ))}
          </div>
        </section>
      )}

      {/* Results — hidden when AI search is active */}
      {aiSearchMode && search.trim() ? null : <section className="space-y-3">
        <p className="text-xs text-muted-foreground">{filtered.length} memor{filtered.length !== 1 ? "ies" : "y"}</p>
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No memories yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Save decisions, insights, and references here. Knowledge compounds when it's findable.
              </p>
            </div>
            <Button variant="default" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" /> Save your first memory
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MemoryCard key={m.id} memory={m} projects={projects} onOpen={() => setSelectedId(m.id)}
                onPin={() => { togglePin(m.id); toast(m.is_pinned ? "Unpinned" : "Pinned"); }} />
            ))}
          </div>
        )}
      </section>}

      {selectedId && <MemoryDetailPanel memoryId={selectedId} onClose={() => setSelectedId(null)} />}
      <CreateMemoryDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function MemoryCard({ memory, projects, onOpen, onPin }: { memory: MemoryEntry; projects: any[]; onOpen: () => void; onPin: () => void }) {
  const linkedNames = projects.filter((p) => memory.linked_project_ids.includes(p.id)).map((p) => p.name);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2 hover:shadow-sm transition-all cursor-pointer" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brain-purple))/0.12] flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{memory.title}</p>
            {memory.is_pinned && <Pin className="h-3 w-3 text-[hsl(var(--brain-amber))] shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{memory.summary}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`text-[9px] border-transparent ${TYPE_COLORS[memory.memory_type]}`}>{TYPE_LABELS[memory.memory_type]}</Badge>
            <span className="text-[9px] text-muted-foreground">{memory.importance_score}/100</span>
            {linkedNames.length > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <FolderKanban className="h-2.5 w-2.5" /> {linkedNames[0]}{linkedNames.length > 1 ? ` +${linkedNames.length - 1}` : ""}
              </span>
            )}
            {memory.linked_idea_ids.length > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Lightbulb className="h-2.5 w-2.5" /> {memory.linked_idea_ids.length} idea{memory.linked_idea_ids.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground">{timeAgo(memory.updated_at)}</span>
          </div>
          {memory.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {memory.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{t}</span>
              ))}
            </div>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onPin(); }}>
          {memory.is_pinned ? <Pin className="h-3.5 w-3.5 text-[hsl(var(--brain-amber))]" /> : <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
        </Button>
      </div>
    </div>
  );
}
