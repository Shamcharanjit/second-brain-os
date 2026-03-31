import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Mic, Clock, Brain, Sparkles, Tag, FolderKanban, CalendarCheck,
  Inbox, Lightbulb, BrainCircuit, ChevronRight, CheckCircle2, Star,
  ArrowRight, Link2, MessageSquare, Mail, Send, Globe, Filter,
  BookOpen, Bookmark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrain } from "@/context/BrainContext";
import type { Capture } from "@/types/brain";

/* ── Types ── */
type TypeFilter = "all" | "task" | "idea" | "reminder" | "follow_up" | "project_note" | "maybe_later";
type TimeFilter = "all" | "today" | "week" | "month";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "idea", label: "Ideas" },
  { value: "reminder", label: "Reminders" },
  { value: "follow_up", label: "Follow-Ups" },
  { value: "project_note", label: "Projects" },
  { value: "maybe_later", label: "Maybe Later" },
];

const TIME_CHIPS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "Last 30 Days" },
];

const SAVED_VIEWS = [
  { label: "Unfinished Ideas", filter: "idea" as TypeFilter },
  { label: "Voice Notes", filter: "all" as TypeFilter, voice: true },
  { label: "Pending Follow-Ups", filter: "follow_up" as TypeFilter },
  { label: "Needs Review", filter: "all" as TypeFilter, review: true },
];

/* ── Resurfaced mock data generator ── */
function generateResurfaced(captures: Capture[]) {
  const results: { capture: Capture; reason: string; context: string }[] = [];
  const ideas = captures.filter((c) => c.ai_data?.category === "idea");
  const tasks = captures.filter((c) => c.ai_data?.category === "task" || c.ai_data?.category === "follow_up");

  if (ideas.length > 0) {
    results.push({
      capture: ideas[0],
      reason: `You captured this idea ${Math.round((Date.now() - new Date(ideas[0].created_at).getTime()) / 3600000)}h ago — it aligns with your current projects.`,
      context: ideas[0].ai_data?.suggested_project || "Ideas Vault",
    });
  }
  if (tasks.length > 1) {
    results.push({
      capture: tasks[1],
      reason: "This follow-up is similar to another pending item — consider grouping them.",
      context: tasks[1].ai_data?.suggested_project || "Inbox",
    });
  }
  const voiceCaptures = captures.filter((c) => c.input_type === "voice");
  if (voiceCaptures.length > 0) {
    results.push({
      capture: voiceCaptures[0],
      reason: "This voice note may be relevant to a project you're actively working on.",
      context: voiceCaptures[0].ai_data?.suggested_project || "Voice Captures",
    });
  }
  // Add a generic one if we have captures
  if (captures.length > 5) {
    const older = captures[captures.length - 2];
    if (older) results.push({
      capture: older,
      reason: `You've mentioned "${older.ai_data?.tags?.[0] || "this topic"}" multiple times — should these be grouped?`,
      context: older.ai_data?.suggested_project || "General",
    });
  }
  return results.slice(0, 4);
}

/* ── Source icon helper ── */
function SourceIcon({ type }: { type: string }) {
  if (type === "voice") return <Mic className="h-3 w-3" />;
  return <MessageSquare className="h-3 w-3" />;
}

/* ── Timeline grouping ── */
function groupByTime(captures: Capture[]) {
  const now = Date.now();
  const groups: { label: string; items: Capture[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const c of captures) {
    const age = now - new Date(c.created_at).getTime();
    if (age < 86400000) groups[0].items.push(c);
    else if (age < 172800000) groups[1].items.push(c);
    else if (age < 604800000) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/* ── Related items (simple mock) ── */
function findRelated(capture: Capture, all: Capture[]): Capture[] {
  if (!capture.ai_data) return [];
  return all
    .filter((c) => c.id !== capture.id && (
      c.ai_data?.suggested_project === capture.ai_data?.suggested_project ||
      c.ai_data?.category === capture.ai_data?.category ||
      c.ai_data?.tags?.some((t) => capture.ai_data?.tags?.includes(t))
    ))
    .slice(0, 2);
}

export default function MemoryPage() {
  const { captures, updateCaptureStatus } = useBrain();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<"search" | "timeline">("search");

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let result = [...captures];

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((c) =>
        c.raw_input.toLowerCase().includes(q) ||
        c.ai_data?.title?.toLowerCase().includes(q) ||
        c.ai_data?.tags?.some((t) => t.toLowerCase().includes(q)) ||
        c.ai_data?.suggested_project?.toLowerCase().includes(q)
      );
    }

    // Type
    if (typeFilter !== "all") result = result.filter((c) => c.ai_data?.category === typeFilter);

    // Time
    const now = Date.now();
    if (timeFilter === "today") result = result.filter((c) => now - new Date(c.created_at).getTime() < 86400000);
    else if (timeFilter === "week") result = result.filter((c) => now - new Date(c.created_at).getTime() < 604800000);
    else if (timeFilter === "month") result = result.filter((c) => now - new Date(c.created_at).getTime() < 2592000000);

    // Voice only
    if (voiceOnly) result = result.filter((c) => c.input_type === "voice");

    // Review only
    if (reviewOnly) result = result.filter((c) => c.review_status === "needs_review");

    return result;
  }, [captures, query, typeFilter, timeFilter, voiceOnly, reviewOnly]);

  const resurfaced = useMemo(() => generateResurfaced(captures), [captures]);
  const timelineGroups = useMemo(() => groupByTime(filtered), [filtered]);

  function applySavedView(sv: typeof SAVED_VIEWS[number]) {
    setTypeFilter(sv.filter);
    setVoiceOnly(sv.voice || false);
    setReviewOnly(sv.review || false);
    setQuery("");
    setView("search");
  }

  /* ── Render a result card ── */
  function ResultCard({ c }: { c: Capture }) {
    const isExpanded = expandedId === c.id;
    const related = isExpanded ? findRelated(c, captures) : [];
    return (
      <div className="rounded-xl border bg-card p-4 space-y-2 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <SourceIcon type={c.input_type} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium">{c.ai_data?.title || c.raw_input.slice(0, 60)}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{c.raw_input}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[9px] capitalize">{c.ai_data?.category?.replace("_", " ")}</Badge>
              {c.input_type === "voice" && <Badge variant="outline" className="text-[9px] gap-0.5"><Mic className="h-2.5 w-2.5" /> Voice</Badge>}
              {c.ai_data?.suggested_project && <Badge variant="outline" className="text-[9px] gap-0.5"><FolderKanban className="h-2.5 w-2.5" /> {c.ai_data.suggested_project}</Badge>}
              <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            {c.ai_data?.tags && c.ai_data.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {c.ai_data.tags.slice(0, 4).map((t) => (
                  <span key={t} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{t}</span>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] shrink-0" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
            {isExpanded ? "Less" : "More"}
          </Button>
        </div>

        {isExpanded && (
          <div className="pl-11 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {c.ai_data?.why_it_matters && (
              <p className="text-[11px] text-muted-foreground italic">"{c.ai_data.why_it_matters}"</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => updateCaptureStatus(c.id, "sent_to_today")}>
                <CalendarCheck className="h-3 w-3" /> Add to Today
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => updateCaptureStatus(c.id, "sent_to_ideas")}>
                <Lightbulb className="h-3 w-3" /> Ideas Vault
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => navigate("/projects")}>
                <Link2 className="h-3 w-3" /> Link to Project
              </Button>
            </div>
            {related.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Connected Thoughts</p>
                {related.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.ai_data?.title || r.raw_input.slice(0, 50)}</span>
                    <Badge variant="secondary" className="text-[8px] shrink-0 capitalize">{r.ai_data?.category?.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Memory</h1>
        <p className="text-sm text-muted-foreground mt-1">Search, revisit, and reconnect the thoughts that matter.</p>
      </div>

      {/* Microcopy */}
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-sm font-medium text-foreground italic">"Ideas are only powerful if they can be found again."</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Your memory, augmented.</p>
      </div>

      {/* Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search thoughts, ideas, reminders, voice notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-sm"
          />
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap gap-1.5">
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setTypeFilter(chip.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all ${
                typeFilter === chip.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Time + special filters */}
        <div className="flex flex-wrap gap-1.5">
          {TIME_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setTimeFilter(chip.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all ${
                timeFilter === chip.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => setVoiceOnly(!voiceOnly)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all flex items-center gap-1 ${
              voiceOnly ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Mic className="h-3 w-3" /> Voice Only
          </button>
          <button
            onClick={() => setReviewOnly(!reviewOnly)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all flex items-center gap-1 ${
              reviewOnly ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <BrainCircuit className="h-3 w-3" /> Needs Review
          </button>
        </div>
      </div>

      {/* Quick Recall */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Recall</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAVED_VIEWS.map((sv) => (
            <button
              key={sv.label}
              onClick={() => applySavedView(sv)}
              className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            >
              {sv.label}
            </button>
          ))}
        </div>
      </section>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("search")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
            view === "search" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <Search className="h-3 w-3" /> Results
        </button>
        <button
          onClick={() => setView("timeline")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
            view === "timeline" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <Clock className="h-3 w-3" /> Timeline
        </button>
      </div>

      {/* Results or Timeline */}
      {view === "search" ? (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matches found. Try different keywords or filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => <ResultCard key={c.id} c={c} />)}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          {timelineGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="pl-4 border-l-2 border-border space-y-2">
                {group.items.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-card p-3 flex items-start gap-3 relative">
                    <div className="absolute -left-[calc(1rem+5px)] top-4 h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium truncate">{c.ai_data?.title || c.raw_input.slice(0, 50)}</span>
                        <Badge variant="secondary" className="text-[8px] capitalize">{c.ai_data?.category?.replace("_", " ")}</Badge>
                        {c.input_type === "voice" && <Badge variant="outline" className="text-[8px] gap-0.5"><Mic className="h-2 w-2" /> Voice</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{c.raw_input}</p>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        {c.ai_data?.suggested_project && <span>{c.ai_data.suggested_project}</span>}
                        <span>{new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Resurfaced by AI */}
      {resurfaced.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resurfaced by AI</h2>
          </div>
          <div className="space-y-2">
            {resurfaced.map((r, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{r.capture.ai_data?.title}</p>
                    <p className="text-[11px] text-muted-foreground">{r.reason}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{r.context}</Badge>
                      <span className="text-[9px] text-muted-foreground">{new Date(r.capture.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-11">
                  <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => updateCaptureStatus(r.capture.id, "sent_to_today")}>
                    <CalendarCheck className="h-3 w-3" /> Reopen
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => navigate("/projects")}>
                    <Link2 className="h-3 w-3" /> Link to Project
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1" onClick={() => updateCaptureStatus(r.capture.id, "archived")}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
