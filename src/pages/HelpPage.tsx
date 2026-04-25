import { Link } from "react-router-dom";
import {
  Sparkles,
  Inbox,
  CalendarDays,
  FolderKanban,
  Lightbulb,
  Search,
  Mic,
  RotateCcw,
  ArrowRight,
  Quote,
} from "lucide-react";
import InsightHaloIcon from "@/components/branding/InsightHaloIcon";

const SECTIONS = [
  {
    icon: Sparkles,
    title: "Quick Capture",
    body: "Type or speak anything you want to remember. Don't worry about where it goes — InsightHalo will figure that out.",
  },
  {
    icon: Sparkles,
    title: "AI Organize",
    body: "Every capture is sorted into Today, Inbox, Projects, Ideas, Memory, or Someday — automatically.",
  },
  {
    icon: Inbox,
    title: "Inbox",
    body: "Review and approve AI suggestions. Anything unclear lands here for a quick second look.",
    to: "/inbox",
  },
  {
    icon: CalendarDays,
    title: "Today",
    body: "See what needs your attention right now. Pin your top 3 priorities and stay focused.",
    to: "/today",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    body: "Track active work and bigger goals. Group related captures, notes, and next actions in one place.",
    to: "/projects",
  },
  {
    icon: Lightbulb,
    title: "Ideas Vault",
    body: "Save business ideas, opportunities, and 'what if' thoughts before they slip away.",
    to: "/ideas",
  },
  {
    icon: Search,
    title: "Memory",
    body: "Long-term notes, references, decisions, and SOPs — searchable whenever you need them later.",
    to: "/memory",
  },
  {
    icon: Mic,
    title: "Voice Capture",
    body: "Speak your thought when typing is too slow. Great for driving, walking, or hands-busy moments.",
    to: "/voice",
  },
  {
    icon: RotateCcw,
    title: "Review Rituals",
    body: "Daily Reset and Weekly Review keep your second brain calm, current, and trusted.",
    to: "/review",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="space-y-3">
        <div className="flex items-center gap-2.5">
          <InsightHaloIcon size="md" />
          <h1 className="text-2xl font-bold tracking-tight">How to use InsightHalo</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Think of InsightHalo as your friendly second brain. Just capture what's on your mind —
          we'll quietly organize it into the right place so you can stay focused on what matters.
        </p>
      </header>

      {/* Try-it-now example */}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Quote className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Try this</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Tell InsightHalo:{" "}
          <span className="font-medium text-primary">
            "Remind me to call the bank tomorrow"
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          It will capture, organize, and route it — automatically into your Today queue.
        </p>
      </section>

      {/* Sections */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What each part does
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const Inner = (
              <div className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
                {s.to && (
                  <ArrowRight className="ml-1 mt-1 h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </div>
            );
            return s.to ? (
              <Link key={s.title} to={s.to} className="block">
                {Inner}
              </Link>
            ) : (
              <div key={s.title}>{Inner}</div>
            );
          })}
        </div>
      </section>

      {/* Closing nudge */}
      <section className="rounded-xl border border-dashed bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/80">Tip:</span> The more you capture, the
          smarter your second brain becomes. There's no wrong way to use InsightHalo — start small,
          and let it grow with you.
        </p>
      </section>
    </div>
  );
}
