import CaptureCard from "@/components/CaptureCard";
import { useBrain } from "@/context/BrainContext";
import { CaptureCategory } from "@/types/brain";
import { useState } from "react";

const filters: { label: string; value: CaptureCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "task" },
  { label: "Ideas", value: "idea" },
  { label: "Reminders", value: "reminder" },
  { label: "Notes", value: "project_note" },
  { label: "Follow-ups", value: "follow_up" },
  { label: "Maybe Later", value: "maybe_later" },
];

export default function InboxPage() {
  const { captures } = useBrain();
  const [filter, setFilter] = useState<CaptureCategory | "all">("all");

  const filtered = filter === "all" ? captures : captures.filter((c) => c.ai_data?.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">Every capture, AI-processed and organized.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No items in this category.</p>
        ) : (
          filtered.map((c) => <CaptureCard key={c.id} capture={c} />)
        )}
      </div>
    </div>
  );
}
