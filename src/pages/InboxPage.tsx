import InboxCard from "@/components/InboxCard";
import { useBrain } from "@/context/BrainContext";
import { CaptureCategory } from "@/types/brain";
import { useState } from "react";
import { Inbox, AlertTriangle, Lightbulb, CheckCircle, Clock } from "lucide-react";

type FilterValue = CaptureCategory | "all" | "processed_filter" | "unprocessed_filter";

const filters: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "task" },
  { label: "Ideas", value: "idea" },
  { label: "Reminders", value: "reminder" },
  { label: "Notes", value: "project_note" },
  { label: "Follow-ups", value: "follow_up" },
  { label: "Maybe Later", value: "maybe_later" },
  { label: "Processed", value: "processed_filter" },
  { label: "Unprocessed", value: "unprocessed_filter" },
];

export default function InboxPage() {
  const { captures } = useBrain();
  const [filter, setFilter] = useState<FilterValue>("all");

  // Exclude archived
  const active = captures.filter((c) => c.status !== "archived");

  const filtered = (() => {
    switch (filter) {
      case "all": return active;
      case "processed_filter": return active.filter((c) => c.status === "processed" || c.status === "sent_to_today" || c.status === "sent_to_ideas");
      case "unprocessed_filter": return active.filter((c) => c.status === "unprocessed");
      default: return active.filter((c) => c.ai_data?.category === filter);
    }
  })();

  // Summary stats
  const totalCaptures = active.length;
  const unprocessedCount = active.filter((c) => c.status === "unprocessed").length;
  const highPriorityCount = active.filter((c) => (c.ai_data?.priority_score ?? 0) >= 8).length;
  const ideasCount = active.filter((c) => c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">Your AI processing center. Review, approve, and route every capture.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Inbox className="h-4 w-4" />} label="Total Captures" value={totalCaptures} color="text-foreground" />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Unprocessed" value={unprocessedCount} color="text-brain-amber" />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="High Priority" value={highPriorityCount} color="text-brain-rose" />
        <SummaryCard icon={<Lightbulb className="h-4 w-4" />} label="Ideas Waiting" value={ideasCount} color="text-brain-purple" />
      </div>

      {/* Filters */}
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

      {/* Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No items in this view.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Capture something new from the Dashboard.</p>
          </div>
        ) : (
          filtered.map((c) => <InboxCard key={c.id} capture={c} />)
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <div className={`flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
