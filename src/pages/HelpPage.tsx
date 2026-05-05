import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Inbox, CalendarDays, FolderKanban, Lightbulb,
  Search, Mic, RotateCcw, ArrowRight, ChevronDown, ChevronUp,
  Mail, Bookmark, Target, BarChart2, MessageSquare, FileText,
  Timer, Bell, Paperclip, Keyboard, HelpCircle, ExternalLink,
  Zap, Brain, Play, Users, Gift, Download,
} from "lucide-react";
import InsightHaloIcon from "@/components/branding/InsightHaloIcon";
import { fetchFeatureUpdates, type FeatureUpdate } from "@/lib/whats-new";
import SeoHead from "@/components/seo/SeoHead";
import { faqPageSchema } from "@/lib/seo/schema";

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is InsightHalo?",
    a: "InsightHalo is your AI-powered second brain. Capture anything — thoughts, tasks, ideas, links, voice notes — and let AI organise it automatically so you can find and act on it later.",
  },
  {
    q: "How does AI triage work?",
    a: "Every time you capture something, our AI reads it and decides where it belongs: Today (urgent tasks), Projects (active work), Ideas Vault (business ideas), Memory (reference notes), or Someday (future plans). You can review and adjust from your Inbox.",
  },
  {
    q: "What's the difference between Inbox and Today?",
    a: "Inbox is where new captures land for your review. Today is your curated daily list — either AI-suggested or manually pinned — of what to actually focus on right now.",
  },
  {
    q: "Can I use InsightHalo on mobile?",
    a: "Yes — InsightHalo works in any mobile browser. Open insighthalo.com in Safari or Chrome and tap 'Add to Home Screen' to install it like a native app. On mobile, swipe right on any capture to pin it, or swipe left to archive.",
  },
  {
    q: "How do I capture from my phone or email?",
    a: "Go to Settings to get your personal capture email address. Forward any email, article, or voice note to it and it will appear in your Inbox automatically.",
  },
  {
    q: "How do I capture from any website?",
    a: "Install the bookmarklet from Settings. Drag it to your browser toolbar — then one click on any page sends it to your Inbox.",
  },
  {
    q: "What is the Pomodoro timer?",
    a: "A 25-minute focus timer that floats over the app. Start it from the Today page by clicking Focus on any task. It helps you work in focused sprints without losing your place.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your captures, memories, and notes are private to your account. We never train AI models on your personal data.",
  },
  {
    q: "Can I export my data?",
    a: "Yes — go to Settings → Data Ownership to export as JSON, Markdown, CSV, Notion-compatible JSON, or Google Calendar (.ics) format. All exports are client-side — nothing is sent to our servers.",
  },
  {
    q: "What does AI Chat do?",
    a: "AI Chat lets you ask questions about your own second brain. 'What did I capture this week about fundraising?' or 'Which projects need attention?' — it searches your actual captures, projects, and memories to respond conversationally.",
  },
  {
    q: "How does the AI semantic memory search work?",
    a: "Toggle the ⚡ AI button on the Memory page. Instead of matching keywords, it understands the meaning of your query and finds memories that are conceptually similar — even if they use completely different words.",
  },
  {
    q: "What is a Team Workspace?",
    a: "A shared space for your team. Create one from the sidebar switcher or by pressing ⌘K and searching 'workspace'. Share an 8-character invite code with teammates. Any capture can be shared to the workspace feed with an optional note.",
  },
  {
    q: "How does the referral programme work?",
    a: "Share your referral link (/referral) and when friends join, you unlock rewards: Early Supporter badge (1 signup), AI credits (3), 1 month Pro free (5), and 3 months Pro + Founder status (10).",
  },
  {
    q: "Will duplicate captures be detected?",
    a: "Yes — as you type a capture, InsightHalo checks if something very similar already exists (55%+ word overlap). An amber banner shows the similar capture before you submit.",
  },
];

// ── FEATURE ICON MAP ─────────────────────────────────────────────────────────
// Maps slug substrings → Lucide icon. New changelog entries with unknown slugs
// automatically fall back to Sparkles — no code change needed.
const SLUG_ICON_MAP: Array<[string, React.ComponentType<any>]> = [
  ["voice",           Mic],
  ["ai-chat",         MessageSquare],
  ["semantic-memory", Brain],
  ["memory",          Brain],
  ["goals",           Target],
  ["referral",        Gift],
  ["workspace",       Users],
  ["team",            Users],
  ["export",          Download],
  ["notion",          Download],
  ["calendar",        CalendarDays],
  ["review",          RotateCcw],
  ["weekly",          RotateCcw],
  ["command-palette", Keyboard],
  ["search",          Search],
  ["duplicate",       Search],
  ["tag",             Lightbulb],
  ["ideas",           Lightbulb],
  ["push-notif",      Bell],
  ["notification",    Bell],
  ["swipe",           Zap],
  ["analytics",       BarChart2],
  ["scratchpad",      FileText],
  ["projects",        FolderKanban],
  ["inbox",           Inbox],
  ["capture",         Zap],
  ["today",           CalendarDays],
];

function iconForSlug(slug: string): React.ComponentType<any> {
  const lower = slug.toLowerCase();
  for (const [key, Icon] of SLUG_ICON_MAP) {
    if (lower.includes(key)) return Icon;
  }
  return Sparkles;
}

// ── SHORTCUTS ────────────────────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: ["Cmd", "K"], action: "Command palette — navigate, capture, search, ask AI" },
  { keys: ["Cmd", "J"], action: "Quick Capture (shortcut)" },
  { keys: ["Cmd", "/"], action: "Memory search" },
  { keys: ["Cmd", "Enter"], action: "Submit capture / Save" },
  { keys: ["Esc"], action: "Close modal or overlay" },
  { keys: ["?"], action: "Show all keyboard shortcuts" },
];

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="pb-3.5 text-xs text-muted-foreground leading-relaxed pr-6">{a}</p>
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, to, tip }: {
  icon: any; title: string; body: string; to?: string; tip?: string;
}) {
  const inner = (
    <div className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
        {tip && <p className="text-[10px] text-primary/70 mt-1">{tip}</p>}
      </div>
      {to && (
        <ArrowRight className="ml-1 mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      )}
    </div>
  );
  return to ? (
    <Link to={to} className="block">{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [faqSearch, setFaqSearch] = useState("");
  const [features, setFeatures] = useState<FeatureUpdate[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);

  useEffect(() => {
    fetchFeatureUpdates()
      .then(setFeatures)
      .finally(() => setFeaturesLoading(false));
  }, []);
  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="space-y-10 max-w-4xl">
      <SeoHead
        slug="/help"
        jsonLd={[faqPageSchema(FAQS.map((f) => ({ q: f.q, a: f.a })))]}
      />

      {/* Hero */}
      <header className="space-y-3">
        <div className="flex items-center gap-2.5">
          <InsightHaloIcon size="md" />
          <h1 className="text-2xl font-bold tracking-tight">Help &amp; Guide</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Everything you need to get the most out of your second brain.
          Browse by feature, search the FAQ, or jump to keyboard shortcuts.
        </p>
      </header>

      {/* Quick start */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Quick start</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Capture something", desc: 'Click the green "+ Quick Capture" button and type or speak anything on your mind.' },
            { step: "2", title: "Check your Inbox", desc: "AI has organised it. Review the suggestion, tweak if needed, and approve it in one tap." },
            { step: "3", title: "Work from Today", desc: "Your daily priority list is ready. Start a Pomodoro timer and focus on what matters most." },
          ].map((s) => (
            <div key={s.step} className="flex gap-3 items-start">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid — auto-populated from changelog.json via Supabase */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          All features
        </h2>
        {featuresLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard
                key={f.id}
                icon={iconForSlug(f.id)}
                title={f.title}
                body={f.message}
                to={f.cta_link ?? undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Capture channels */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ways to capture
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Zap, label: "Quick Capture button", desc: "The green + button — always visible in the sidebar. Works anywhere in the app." },
            { icon: Mic, label: "Voice capture", desc: "Tap the mic icon. Speak naturally. Transcribed and triaged automatically." },
            { icon: Mail, label: "Email to Inbox", desc: "Forward any email to your personal capture address. Get it from Settings." },
            { icon: Bookmark, label: "Browser bookmarklet", desc: "Save any webpage in one click. Install from Settings → Bookmarklet." },
            { icon: Paperclip, label: "File attachment", desc: "Attach images, PDFs, or audio files when creating a capture." },
            { icon: Bell, label: "Push notification tap", desc: "Tap a reminder notification to open and review the related capture." },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Keyboard shortcuts
          </h2>
        </div>
        <div className="rounded-xl border bg-card divide-y">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <kbd className="text-xs bg-muted border rounded px-1.5 py-0.5 font-mono">{k}</kbd>
                    {i < s.keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Frequently asked questions
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions…"
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            className="w-full rounded-xl border bg-card pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="rounded-xl border bg-card px-4">
          {filteredFaqs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No results for "{faqSearch}"
            </p>
          ) : (
            filteredFaqs.map((f) => <FaqItem key={f.q} {...f} />)
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-dashed bg-muted/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Still need help?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Email us — we usually reply within a few hours.
          </p>
        </div>
        <a
          href="mailto:support@insighthalo.com"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
        >
          support@insighthalo.com <ExternalLink className="h-3 w-3" />
        </a>
      </section>

    </div>
  );
}
