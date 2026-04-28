import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBrain } from "@/context/BrainContext";
import { Hourglass, Search, ArrowUpDown, Zap, Inbox, Lightbulb, Trash2, BrainCircuit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Capture } from "@/types/brain";

type SortValue = "newest" | "priority" | "oldest";

const sortOptions: { label: string; value: SortValue }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Highest Priority", value: "priority" },
  { label: "Oldest First", value: "oldest" },
];

export default function SomedayPage() {
  const { captures, routeCapture, archiveCapture } = useBrain();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("priority");

  const items = useMemo(() => {
    let list = captures.filter((c) => c.status === "sent_to_someday" && c.status !== "archived");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.raw_input.toLowerCase().includes(q) ||
          (c.ai_data?.title ?? "").toLowerCase().includes(q) ||
          (c.ai_data?.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "priority") return (b.ai_data?.priority_score ?? 0) - (a.ai_data?.priority_score ?? 0);
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [captures, search, sort]);

  const highPotential = items.filter((c) => (c.ai_data?.priority_score ?? 0) >= 65).length;

  const handlePromoteToday = (id: string) => {
    routeCapture(id, "sent_to_today");
    toast.success("Moved to Today");
  };
  const handlePromoteInbox = (id: string) => {
    routeCapture(id, "processed");
    toast.success("Moved back to Inbox");
  };
  const handlePromoteIdeas = (id: string) => {
    routeCapture(id, "sent_to_ideas");
    toast.success("Moved to Ideas Vault");
  };
  const handleArchive = (id: string) => {
    archiveCapture(id);
    toast("Archived");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Someday</h1>
            <p className="text-sm text-muted-foreground">
              Captured but not urgent — revisit when the time is right.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <Hourglass className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Parked</span>
          </div>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">High Potential</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--brain-amber))]">{highPotential}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1 col-span-2 md:col-span-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tip</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Review Someday monthly. Promote what's relevant now, archive what's not.</p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search someday items…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortValue)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
            {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-1">
            <Hourglass className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              {search ? "No items match your search." : "Nothing parked for someday yet."}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              When you route captures here from the Inbox, they'll appear for future review.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs mt-1" onClick={() => navigate("/app/inbox")}>
            <Inbox className="h-3.5 w-3.5" /> Go to Inbox
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => <SomedayCard key={c.id} capture={c} onToday={handlePromoteToday} onInbox={handlePromoteInbox} onIdeas={handlePromoteIdeas} onArchive={handleArchive} />)}
        </div>
      )}
    </div>
  );
}

function SomedayCard({ capture, onToday, onInbox, onIdeas, onArchive }: {
  capture: Capture;
  onToday: (id: string) => void;
  onInbox: (id: string) => void;
  onIdeas: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const ai = capture.ai_data;
  const priority = ai?.priority_score ?? 0;
  const isHighPotential = priority >= 65;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-all hover:shadow-sm ${isHighPotential ? "border-[hsl(var(--brain-amber))]/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{ai?.title || capture.raw_input}</p>
          {ai?.why_it_matters && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">{ai.why_it_matters}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isHighPotential && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--brain-amber))]/10 text-[hsl(var(--brain-amber))] border border-[hsl(var(--brain-amber))]/20 font-medium">
              High potential
            </span>
          )}
          <Badge variant="secondary" className="text-[10px]">{priority}/100</Badge>
        </div>
      </div>

      {/* Tags + age */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        {(ai?.tags ?? []).slice(0, 4).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
        ))}
        <span className="text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onToday(capture.id)}>
          <Zap className="h-3 w-3" /> Do It Today
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onIdeas(capture.id)}>
          <Lightbulb className="h-3 w-3" /> Move to Ideas
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onInbox(capture.id)}>
          <Inbox className="h-3 w-3" /> Back to Inbox
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground ml-auto" onClick={() => onArchive(capture.id)}>
          <Trash2 className="h-3 w-3" /> Archive
        </Button>
      </div>
    </div>
  );
}
