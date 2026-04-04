import InboxCard from "@/components/InboxCard";
import CaptureDetailDrawer from "@/components/capture/CaptureDetailDrawer";
import { useBrain } from "@/context/BrainContext";
import { useCaptureAttachmentCounts } from "@/hooks/useCaptureAttachments";
import { CaptureCategory, Capture } from "@/types/brain";
import { useState, useMemo } from "react";
import {
  Inbox, AlertTriangle, Lightbulb, Clock, Search,
  ArrowUpDown, CheckCircle2, BrainCircuit, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FilterValue = CaptureCategory | "all" | "pending_review" | "reviewed_filter" | "high_priority";
type SortValue = "newest" | "priority" | "needs_decision";

const filters: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Pending Review", value: "pending_review" },
  { label: "Tasks", value: "task" },
  { label: "Reminders", value: "reminder" },
  { label: "Ideas", value: "idea" },
  { label: "Goals", value: "goal" },
  { label: "Notes", value: "note" },
  { label: "Projects", value: "project" },
  { label: "Follow-ups", value: "follow_up" },
  { label: "High Priority", value: "high_priority" },
  { label: "Reviewed", value: "reviewed_filter" },
];

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Highest Priority", value: "priority" },
  { label: "Needs Decision", value: "needs_decision" },
];

export default function InboxPage() {
  const { captures } = useBrain();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("needs_decision");
  const [search, setSearch] = useState("");
  const [detailCapture, setDetailCapture] = useState<Capture | null>(null);

  // Attachment counts (lightweight — only capture_id column fetched)
  const captureIds = useMemo(() => captures.map((c) => c.id), [captures]);
  const attachmentCounts = useCaptureAttachmentCounts(captureIds);

  // Inbox = everything not archived
  const active = captures.filter((c) => c.status !== "archived");

  const filtered = useMemo(() => {
    let list = active;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.raw_input.toLowerCase().includes(q) ||
          c.ai_data?.title.toLowerCase().includes(q) ||
          c.ai_data?.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    switch (filter) {
      case "all": break;
      case "pending_review":
        list = list.filter((c) => c.review_status !== "reviewed");
        break;
      case "reviewed_filter":
        list = list.filter((c) => c.review_status === "reviewed");
        break;
      case "high_priority":
        list = list.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65);
        break;
      default:
        list = list.filter((c) => c.ai_data?.category === filter);
    }
    list = [...list].sort((a, b) => {
      if (sort === "priority") return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      if (sort === "needs_decision") {
        const aP = a.review_status !== "reviewed" ? 1 : 0;
        const bP = b.review_status !== "reviewed" ? 1 : 0;
        if (bP !== aP) return bP - aP;
        return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [active, filter, sort, search]);

  const pendingReview = filtered.filter((c) => c.review_status !== "reviewed");
  const reviewed = filtered.filter((c) => c.review_status === "reviewed");

  // Stats
  const totalPending = active.filter((c) => c.review_status !== "reviewed").length;
  const highPriorityCount = active.filter((c) => c.review_status !== "reviewed" && (c.ai_data?.priority_score ?? 0) >= 65).length;
  const needsReviewCount = active.filter((c) => c.review_status === "needs_review").length;
  const reviewedToday = active.filter((c) => {
    if (!c.reviewed_at) return false;
    return (Date.now() - new Date(c.reviewed_at).getTime()) < 86400000;
  }).length;

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
              Review AI decisions, approve or adjust, and route to the right place.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Clock className="h-4 w-4" />} label="Pending Review" value={totalPending} accent="text-[hsl(var(--brain-amber))]" highlight={totalPending > 0} />
        <KPICard icon={<AlertTriangle className="h-4 w-4" />} label="High Priority" value={highPriorityCount} accent="text-[hsl(var(--brain-rose))]" highlight={highPriorityCount > 0} />
        <KPICard icon={<Lightbulb className="h-4 w-4" />} label="Needs AI Review" value={needsReviewCount} accent="text-[hsl(var(--brain-purple))]" highlight={needsReviewCount > 0} />
        <KPICard icon={<CheckCircle2 className="h-4 w-4" />} label="Reviewed Today" value={reviewedToday} accent="text-primary" />
      </div>

      {/* Filter + Search + Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search captures…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
              {f.value === "pending_review" && totalPending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                  {totalPending}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Review Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
          <h2 className="text-base font-semibold tracking-tight">Pending Review</h2>
          {pendingReview.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{pendingReview.length}</Badge>
          )}
        </div>

        {pendingReview.length === 0 ? (
          <EmptyState message="All caught up! No items need review." />
        ) : (
          <div className="space-y-4">
            {pendingReview.map((c) => (
              <InboxCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </section>

      {/* Reviewed Section */}
      {reviewed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">Recently Reviewed</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{reviewed.length}</Badge>
          </div>
          <div className="space-y-2">
            {reviewed.slice(0, 8).map((c) => (
              <InboxCard key={c.id} capture={c} />
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
