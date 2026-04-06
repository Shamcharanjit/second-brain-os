import { useBrain } from "@/context/BrainContext";
import { useState, useMemo } from "react";
import {
  Lightbulb, Sparkles, Eye, Star, Search, ArrowUpDown,
  TrendingUp, FolderOpen, CalendarClock, FolderPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Capture, IdeaStatus } from "@/types/brain";
import IdeaHeroCard from "@/components/ideas/IdeaHeroCard";
import IdeaCompactCard from "@/components/ideas/IdeaCompactCard";
import IdeaEditPanel from "@/components/ideas/IdeaEditPanel";

type FilterValue = "all" | "new" | "high_potential" | "explored" | "parked" | "converted" | "archived";
type SortValue = "newest" | "potential" | "reviewed";

const filters: { label: string; value: FilterValue }[] = [
  { label: "All Ideas", value: "all" },
  { label: "New", value: "new" },
  { label: "High Potential", value: "high_potential" },
  { label: "Explored", value: "explored" },
  { label: "Parked", value: "parked" },
  { label: "Converted", value: "converted" },
  { label: "Archived", value: "archived" },
];

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Highest Potential", value: "potential" },
  { label: "Newest First", value: "newest" },
  { label: "Recently Reviewed", value: "reviewed" },
];

export default function IdeasVaultPage() {
  const { captures, updateCaptureStatus, updateIdeaStatus, convertIdeaToProject, editCaptureAI, routeCapture } = useBrain();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("potential");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const allIdeas = useMemo(() =>
    captures.filter(
      (c) =>
        c.status === "sent_to_ideas" ||
        c.ai_data?.category === "idea" ||
        c.ai_data?.category === "maybe_later"
    ), [captures]);

  const active = allIdeas.filter((c) => c.status !== "archived" && c.idea_status !== "archived" && c.idea_status !== "converted_to_project");
  const archived = allIdeas.filter((c) => c.status === "archived" || c.idea_status === "archived");
  const converted = allIdeas.filter((c) => c.idea_status === "converted_to_project");

  const filtered = useMemo(() => {
    let list: Capture[];
    switch (filter) {
      case "archived": list = archived; break;
      case "converted": list = converted; break;
      case "new": list = active.filter((c) => c.idea_status === "new"); break;
      case "high_potential": list = active.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65); break;
      case "explored": list = active.filter((c) => c.idea_status === "explored"); break;
      case "parked": list = active.filter((c) => c.idea_status === "parked"); break;
      default: list = active;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.raw_input.toLowerCase().includes(q) ||
          c.ai_data?.title.toLowerCase().includes(q) ||
          c.ai_data?.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "potential") return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      if (sort === "reviewed") return new Date(b.reviewed_at ?? b.created_at).getTime() - new Date(a.reviewed_at ?? a.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [active, archived, converted, filter, sort, search]);

  // Stats
  const totalActive = active.length;
  const newCount = active.filter((c) => c.idea_status === "new").length;
  const highPotential = active.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65).length;
  const convertedCount = converted.length;

  const heroIdeas = filtered.slice(0, 4);
  const restIdeas = filtered.slice(4);

  const handlePromote = (id: string) => {
    routeCapture(id, "sent_to_today");
    toast.success("Promoted to Today");
  };
  const handleArchive = (id: string) => {
    updateIdeaStatus(id, "archived");
    toast("Archived", { description: "Idea moved to archive." });
  };
  const handleExplore = (id: string) => {
    updateIdeaStatus(id, "explored");
    toast.success("Marked as Explored");
  };
  const handlePark = (id: string) => {
    updateIdeaStatus(id, "parked");
    toast("Parked", { description: "Idea parked for later." });
  };
  const handleConvert = (id: string) => {
    convertIdeaToProject(id);
    toast.success("Converted to Project");
  };
  const handleEdit = (id: string) => setEditingId(id);

  const editingCapture = editingId ? captures.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[hsl(var(--brain-amber))/0.15]">
            <Lightbulb className="h-5 w-5 text-[hsl(var(--brain-amber))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ideas Vault</h1>
            <p className="text-sm text-muted-foreground">
              Your opportunity bank. Capture, explore, and convert the best ideas into action.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Lightbulb className="h-4 w-4" />} label="Total Ideas" value={totalActive} accent="text-foreground" />
        <KPICard icon={<Star className="h-4 w-4" />} label="New" value={newCount} accent="text-[hsl(var(--brain-teal))]" highlight={newCount > 0} />
        <KPICard icon={<TrendingUp className="h-4 w-4" />} label="High Potential" value={highPotential} accent="text-[hsl(var(--brain-amber))]" highlight={highPotential > 0} />
        <KPICard icon={<FolderPlus className="h-4 w-4" />} label="Converted" value={convertedCount} accent="text-[hsl(var(--brain-purple))]" />
      </div>

      {/* Filters + Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ideas…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Panel */}
      {editingCapture && (
        <IdeaEditPanel
          capture={editingCapture}
          onSave={(id, updates) => {
            editCaptureAI(id, updates);
            toast.success("Idea updated");
          }}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Top Opportunities */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
          <h2 className="text-base font-semibold tracking-tight">Top Opportunities</h2>
          {heroIdeas.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{heroIdeas.length}</Badge>
          )}
        </div>

        {heroIdeas.length === 0 ? (
          <EmptyState message="No ideas match your filters. Capture something creative!" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {heroIdeas.map((c) => (
              <IdeaHeroCard
                key={c.id} capture={c}
                onPromote={handlePromote} onArchive={handleArchive}
                onExplore={handleExplore} onPark={handlePark}
                onConvert={handleConvert} onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* All Saved Ideas */}
      {restIdeas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold tracking-tight">All Saved Ideas</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{restIdeas.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {restIdeas.map((c) => (
              <IdeaCompactCard
                key={c.id} capture={c}
                onPromote={handlePromote} onArchive={handleArchive}
                onExplore={handleExplore} onPark={handlePark}
                onConvert={handleConvert}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, accent, highlight }: {
  icon: React.ReactNode; label: string; value: number; accent: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-1 transition-all ${highlight ? "ring-1 ring-primary/20 shadow-sm" : ""}`}>
      <div className="flex items-center gap-1.5">
        <span className={accent}>{icon}</span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
      <Lightbulb className="h-10 w-10 text-muted-foreground/30 mb-1" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">Capture a thought and it may end up here.</p>
    </div>
  );
}
