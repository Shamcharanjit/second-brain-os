import { useBrain } from "@/context/BrainContext";
import { useState, useMemo } from "react";
import {
  Lightbulb, Sparkles, Clock, Eye, Star, Search, ArrowUpDown,
  Rocket, FolderPlus, StickyNote, Archive, CheckCircle2, Zap,
  TrendingUp, FolderOpen, ArrowRight, CalendarClock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Capture } from "@/types/brain";

type FilterValue = "all" | "high_potential" | "needs_review" | "experiments" | "maybe_later" | "archived";
type SortValue = "newest" | "potential" | "reviewed";

const filters: { label: string; value: FilterValue }[] = [
  { label: "All Ideas", value: "all" },
  { label: "High Potential", value: "high_potential" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Experiments", value: "experiments" },
  { label: "Maybe Later", value: "maybe_later" },
  { label: "Archived", value: "archived" },
];

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Highest Potential", value: "potential" },
  { label: "Recently Reviewed", value: "reviewed" },
];

function effortLevel(score: number): { label: string; color: string } {
  if (score >= 8) return { label: "Low Effort", color: "text-brain-teal" };
  if (score >= 5) return { label: "Medium Effort", color: "text-brain-amber" };
  return { label: "High Effort", color: "text-brain-rose" };
}

function potentialReasoning(capture: Capture): string {
  const ai = capture.ai_data;
  if (!ai) return "";
  if (ai.priority_score >= 8) return "High strategic value — could drive significant impact if acted on soon.";
  if (ai.priority_score >= 6) return "Solid opportunity — worth exploring further in your next planning session.";
  if (ai.priority_score >= 4) return "Interesting concept — park it and revisit when bandwidth opens up.";
  return "Low urgency — keep it stored for future inspiration.";
}

export default function IdeasVaultPage() {
  const { captures, updateCaptureStatus } = useBrain();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("potential");
  const [search, setSearch] = useState("");

  // All ideas = sent_to_ideas OR idea/maybe_later category (non-archived for non-archived filter)
  const allIdeas = useMemo(() =>
    captures.filter(
      (c) =>
        c.status === "sent_to_ideas" ||
        c.ai_data?.category === "idea" ||
        c.ai_data?.category === "maybe_later"
    ), [captures]);

  const nonArchived = allIdeas.filter((c) => c.status !== "archived");
  const archived = allIdeas.filter((c) => c.status === "archived");

  const filtered = useMemo(() => {
    let list: Capture[];
    switch (filter) {
      case "archived":
        list = archived; break;
      case "high_potential":
        list = nonArchived.filter((c) => (c.ai_data?.priority_score ?? 0) >= 7); break;
      case "needs_review":
        list = nonArchived.filter((c) => c.status === "unprocessed"); break;
      case "experiments":
        list = nonArchived.filter((c) => c.ai_data?.category === "idea"); break;
      case "maybe_later":
        list = nonArchived.filter((c) => c.ai_data?.category === "maybe_later"); break;
      default:
        list = nonArchived;
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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [nonArchived, archived, filter, sort, search]);

  // Stats
  const totalIdeas = nonArchived.length;
  const highPotential = nonArchived.filter((c) => (c.ai_data?.priority_score ?? 0) >= 7).length;
  const needsReview = nonArchived.filter((c) => c.status === "unprocessed").length;
  const thisWeek = nonArchived.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 86400000;
  }).length;

  // Hero = top 4 by potential
  const heroIdeas = filtered.slice(0, 4);
  const restIdeas = filtered.slice(4);

  // Review queue = unprocessed, oldest first
  const reviewQueue = nonArchived
    .filter((c) => c.status === "unprocessed")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 4);

  const handlePromote = (id: string) => {
    updateCaptureStatus(id, "sent_to_today");
    toast.success("Promoted to Today");
  };
  const handleArchive = (id: string) => {
    updateCaptureStatus(id, "archived");
    toast("Archived", { description: "Idea moved to archive." });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-brain-amber/15">
            <Lightbulb className="h-5 w-5 text-brain-amber" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ideas Vault</h1>
            <p className="text-sm text-muted-foreground">
              Store opportunities, revisit them later, and turn the best ones into action.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Lightbulb className="h-4 w-4" />} label="Total Ideas" value={totalIdeas} accent="text-foreground" />
        <KPICard icon={<TrendingUp className="h-4 w-4" />} label="High Potential" value={highPotential} accent="text-brain-teal" highlight={highPotential > 0} />
        <KPICard icon={<Eye className="h-4 w-4" />} label="Needs Review" value={needsReview} accent="text-brain-amber" highlight={needsReview > 0} />
        <KPICard icon={<Star className="h-4 w-4" />} label="This Week" value={thisWeek} accent="text-brain-purple" />
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

      {/* Hero: Ideas Worth Revisiting */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brain-amber" />
          <h2 className="text-base font-semibold tracking-tight">Ideas Worth Revisiting</h2>
          {heroIdeas.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{heroIdeas.length}</Badge>
          )}
        </div>

        {heroIdeas.length === 0 ? (
          <EmptyState message="No ideas match your filters. Capture something creative!" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {heroIdeas.map((c) => (
              <IdeaHeroCard key={c.id} capture={c} onPromote={handlePromote} onArchive={handleArchive} />
            ))}
          </div>
        )}
      </section>

      {/* Review Queue */}
      {reviewQueue.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brain-purple" />
            <h2 className="text-base font-semibold tracking-tight">Review Queue</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{reviewQueue.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {reviewQueue.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 group hover:border-primary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.ai_data?.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Captured {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast.info("Review opened — coming soon!")}>
                  Review Now
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

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
              <IdeaCompactCard key={c.id} capture={c} onPromote={handlePromote} onArchive={handleArchive} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Hero Idea Card ── */
function IdeaHeroCard({ capture, onPromote, onArchive }: { capture: Capture; onPromote: (id: string) => void; onArchive: (id: string) => void }) {
  const ai = capture.ai_data;
  if (!ai) return null;
  const effort = effortLevel(10 - ai.priority_score); // invert: high-prio ideas are low effort to decide on
  const reasoning = potentialReasoning(capture);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md hover:border-primary/20 transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{ai.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{ai.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-lg font-bold ${ai.priority_score >= 7 ? "text-brain-teal" : ai.priority_score >= 5 ? "text-brain-amber" : "text-muted-foreground"}`}>
            {ai.priority_score}/10
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Potential</span>
        </div>
      </div>

      {/* Original idea */}
      <div className="rounded-md bg-secondary/50 px-3 py-2">
        <p className="text-[11px] text-muted-foreground italic">"{capture.raw_input}"</p>
      </div>

      {/* AI Opportunity Framing */}
      <div className="space-y-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Opportunity Insight</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className={`font-medium ${effort.color}`}>{effort.label}</span>
          {ai.suggested_project && (
            <span className="text-muted-foreground flex items-center gap-1">
              <FolderOpen className="h-3 w-3" /> {ai.suggested_project}
            </span>
          )}
        </div>
        {ai.next_action && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-1">
            <ArrowRight className="h-3 w-3" />
            {ai.next_action}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ai.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onPromote(capture.id)}>
          <Rocket className="h-3 w-3" /> Promote to Today
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.info("Convert to Project — coming soon!")}>
          <FolderPlus className="h-3 w-3" /> Convert
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.info("Notes — coming soon!")}>
          <StickyNote className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto text-muted-foreground" onClick={() => onArchive(capture.id)}>
          <Archive className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ── Compact Idea Card ── */
function IdeaCompactCard({ capture, onPromote, onArchive }: { capture: Capture; onPromote: (id: string) => void; onArchive: (id: string) => void }) {
  const ai = capture.ai_data;
  if (!ai) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2.5 hover:border-primary/20 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug truncate">{ai.title}</h3>
        <span className={`text-xs font-bold shrink-0 ${ai.priority_score >= 7 ? "text-brain-teal" : "text-muted-foreground"}`}>
          {ai.priority_score}/10
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{ai.summary}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ai.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onPromote(capture.id)}>
          <Rocket className="h-2.5 w-2.5" /> Today
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 ml-auto text-muted-foreground" onClick={() => onArchive(capture.id)}>
          <Archive className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Shared Components ── */
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
      <Lightbulb className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
