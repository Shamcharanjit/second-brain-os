import InboxCard from "@/components/InboxCard";
import { useBrain } from "@/context/BrainContext";
import { CaptureCategory } from "@/types/brain";
import { useState, useMemo } from "react";
import {
  Inbox, AlertTriangle, Lightbulb, Clock, Search,
  ArrowUpDown, CheckCircle2, BrainCircuit, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type FilterValue = CaptureCategory | "all" | "processed_filter" | "unprocessed_filter" | "high_priority";
type SortValue = "newest" | "priority" | "needs_decision";

const filters: { label: string; value: FilterValue; icon?: React.ReactNode }[] = [
  { label: "All", value: "all" },
  { label: "Unprocessed", value: "unprocessed_filter" },
  { label: "Tasks", value: "task" },
  { label: "Reminders", value: "reminder" },
  { label: "Ideas", value: "idea" },
  { label: "High Priority", value: "high_priority" },
  { label: "Follow-ups", value: "follow_up" },
  { label: "Notes", value: "project_note" },
  { label: "Maybe Later", value: "maybe_later" },
  { label: "Processed", value: "processed_filter" },
];

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Highest Priority", value: "priority" },
  { label: "Needs Decision", value: "needs_decision" },
];

const destinationLabel: Record<string, string> = {
  processed: "Processed",
  sent_to_today: "→ Today",
  sent_to_ideas: "→ Ideas Vault",
  archived: "Archived",
};

export default function InboxPage() {
  const { captures } = useBrain();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [search, setSearch] = useState("");

  const active = captures.filter((c) => c.status !== "archived");

  // Filtered
  const filtered = useMemo(() => {
    let list = active;
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.raw_input.toLowerCase().includes(q) ||
          c.ai_data?.title.toLowerCase().includes(q) ||
          c.ai_data?.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    // filter
    switch (filter) {
      case "all": break;
      case "processed_filter":
        list = list.filter((c) => c.status === "processed" || c.status === "sent_to_today" || c.status === "sent_to_ideas");
        break;
      case "unprocessed_filter":
        list = list.filter((c) => c.status === "unprocessed");
        break;
      case "high_priority":
        list = list.filter((c) => (c.ai_data?.priority_score ?? 0) >= 7);
        break;
      default:
        list = list.filter((c) => c.ai_data?.category === filter);
    }
    // sort
    list = [...list].sort((a, b) => {
      if (sort === "priority") return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      if (sort === "needs_decision") {
        const aU = a.status === "unprocessed" ? 1 : 0;
        const bU = b.status === "unprocessed" ? 1 : 0;
        if (bU !== aU) return bU - aU;
        return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [active, filter, sort, search]);

  // Split into unprocessed (hero) and processed (secondary)
  const needsProcessing = filtered.filter((c) => c.status === "unprocessed");
  const recentlyProcessed = filtered.filter((c) => c.status !== "unprocessed");

  // Stats
  const totalCaptures = active.length;
  const unprocessedCount = active.filter((c) => c.status === "unprocessed").length;
  const highPriorityCount = active.filter((c) => (c.ai_data?.priority_score ?? 0) >= 7).length;
  const needsDecisionCount = active.filter((c) => c.status === "unprocessed" && (c.ai_data?.priority_score ?? 0) >= 5).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Review raw captures, decide what matters, and let AI organize the rest.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Inbox className="h-4 w-4" />} label="Total Captures" value={totalCaptures} accent="text-foreground" />
        <KPICard icon={<Clock className="h-4 w-4" />} label="Unprocessed" value={unprocessedCount} accent="text-brain-amber" highlight={unprocessedCount > 0} />
        <KPICard icon={<AlertTriangle className="h-4 w-4" />} label="High Priority" value={highPriorityCount} accent="text-brain-rose" highlight={highPriorityCount > 0} />
        <KPICard icon={<Lightbulb className="h-4 w-4" />} label="Needs Decision" value={needsDecisionCount} accent="text-brain-purple" highlight={needsDecisionCount > 0} />
      </div>

      {/* Filter + Search + Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search captures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
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
              {f.value === "unprocessed_filter" && unprocessedCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                  {unprocessedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hero: Needs Processing */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brain-amber" />
          <h2 className="text-base font-semibold tracking-tight">Needs Processing</h2>
          {needsProcessing.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{needsProcessing.length}</Badge>
          )}
        </div>

        {needsProcessing.length === 0 ? (
          <EmptyState message="All caught up! No items need processing." />
        ) : (
          <div className="space-y-4">
            {needsProcessing.map((c) => (
              <InboxCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </section>

      {/* Secondary: Recently Processed */}
      {recentlyProcessed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">Recently Processed</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{recentlyProcessed.length}</Badge>
          </div>

          <div className="grid gap-2">
            {recentlyProcessed.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card/60 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.ai_data?.summary}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {destinationLabel[c.status] ?? c.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
