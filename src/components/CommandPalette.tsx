/**
 * CommandPalette
 *
 * Spotlight-style Cmd+K command palette.
 * Opens from AppLayout when user presses Cmd+K / Ctrl+K.
 *
 * Features:
 *   - Fuzzy search across all commands
 *   - Navigate: go to any page instantly
 *   - Actions: capture, review, pomodoro, AI chat
 *   - Memory search: type anything → opens Memory with pre-filled query
 *   - AI ask: type a question → opens AI Chat with it
 *   - Full keyboard nav: ↑/↓ arrows, Enter, Escape
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ArrowRight, CalendarDays, Inbox, FolderKanban, Lightbulb,
  Brain, Target, BarChart2, FileText, RotateCcw, Settings, HelpCircle,
  Sparkles, MessageSquare, Zap, Timer, Rocket, BookOpen, Home,
  BrainCircuit, X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ── Command definitions ───────────────────────────────────────────────────────

interface Command {
  id:       string;
  group:    "navigate" | "action" | "create";
  icon:     React.ComponentType<{ className?: string }>;
  label:    string;
  desc?:    string;
  shortcut?: string;
  action:   (navigate: ReturnType<typeof useNavigate>, helpers: Helpers) => void;
  keywords?: string[];
}

interface Helpers {
  openCapture: () => void;
  closeCommandPalette: () => void;
}

const COMMANDS: Command[] = [
  // ── Navigate ───────────────────────────────────────────────────────────────
  {
    id: "go-home", group: "navigate", icon: Home,
    label: "Dashboard", desc: "Overview, stats, and quick actions",
    action: (nav, { closeCommandPalette }) => { nav("/app"); closeCommandPalette(); },
    keywords: ["home", "overview", "dashboard"],
  },
  {
    id: "go-inbox", group: "navigate", icon: Inbox,
    label: "Inbox", desc: "Review AI-organised captures",
    action: (nav, { closeCommandPalette }) => { nav("/inbox"); closeCommandPalette(); },
    keywords: ["inbox", "triage", "review captures"],
  },
  {
    id: "go-today", group: "navigate", icon: CalendarDays,
    label: "Today", desc: "Your daily priority list",
    action: (nav, { closeCommandPalette }) => { nav("/today"); closeCommandPalette(); },
    keywords: ["today", "tasks", "focus", "priority"],
  },
  {
    id: "go-projects", group: "navigate", icon: FolderKanban,
    label: "Projects", desc: "Active projects and next actions",
    action: (nav, { closeCommandPalette }) => { nav("/projects"); closeCommandPalette(); },
    keywords: ["projects", "work", "kanban"],
  },
  {
    id: "go-ideas", group: "navigate", icon: Lightbulb,
    label: "Ideas Vault", desc: "Business ideas and opportunities",
    action: (nav, { closeCommandPalette }) => { nav("/ideas"); closeCommandPalette(); },
    keywords: ["ideas", "vault", "opportunities", "business"],
  },
  {
    id: "go-memory", group: "navigate", icon: Brain,
    label: "Memory", desc: "Long-term reference notes",
    action: (nav, { closeCommandPalette }) => { nav("/memory"); closeCommandPalette(); },
    keywords: ["memory", "notes", "knowledge", "reference"],
  },
  {
    id: "go-goals", group: "navigate", icon: Target,
    label: "Goals", desc: "Track goals and milestones",
    action: (nav, { closeCommandPalette }) => { nav("/goals"); closeCommandPalette(); },
    keywords: ["goals", "milestones", "targets"],
  },
  {
    id: "go-ai-chat", group: "navigate", icon: MessageSquare,
    label: "AI Chat", desc: "Ask your second brain anything",
    action: (nav, { closeCommandPalette }) => { nav("/ai-chat"); closeCommandPalette(); },
    keywords: ["ai", "chat", "ask", "search", "question"],
  },
  {
    id: "go-analytics", group: "navigate", icon: BarChart2,
    label: "Analytics", desc: "Capture streaks and activity charts",
    action: (nav, { closeCommandPalette }) => { nav("/analytics"); closeCommandPalette(); },
    keywords: ["analytics", "stats", "charts", "streak"],
  },
  {
    id: "go-scratchpad", group: "navigate", icon: FileText,
    label: "Scratchpad", desc: "Freeform private writing space",
    action: (nav, { closeCommandPalette }) => { nav("/scratchpad"); closeCommandPalette(); },
    keywords: ["scratchpad", "notes", "draft", "write"],
  },
  {
    id: "go-review", group: "navigate", icon: RotateCcw,
    label: "Daily Review", desc: "Inbox reset and daily planning",
    action: (nav, { closeCommandPalette }) => { nav("/review"); closeCommandPalette(); },
    keywords: ["review", "daily", "reset", "plan"],
  },
  {
    id: "go-settings", group: "navigate", icon: Settings,
    label: "Settings", desc: "Account, notifications, data",
    action: (nav, { closeCommandPalette }) => { nav("/settings"); closeCommandPalette(); },
    keywords: ["settings", "account", "preferences", "profile"],
  },
  {
    id: "go-help", group: "navigate", icon: HelpCircle,
    label: "Help & Guide", desc: "Features, FAQ, keyboard shortcuts",
    action: (nav, { closeCommandPalette }) => { nav("/help"); closeCommandPalette(); },
    keywords: ["help", "guide", "faq", "shortcuts", "how"],
  },
  {
    id: "go-whats-new", group: "navigate", icon: Rocket,
    label: "What's New", desc: "Latest features and updates",
    action: (nav, { closeCommandPalette }) => { nav("/whats-new"); closeCommandPalette(); },
    keywords: ["whats new", "updates", "changelog", "releases"],
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  {
    id: "action-capture", group: "action", icon: Zap,
    label: "Quick Capture", desc: "Add a new thought right now",
    shortcut: "⌘J",
    action: (_, { openCapture, closeCommandPalette }) => { closeCommandPalette(); openCapture(); },
    keywords: ["capture", "add", "new", "thought", "task", "idea"],
  },
  {
    id: "action-review", group: "action", icon: RotateCcw,
    label: "Start Daily Review", desc: "Clear inbox and plan your day",
    action: (nav, { closeCommandPalette }) => { nav("/review"); closeCommandPalette(); },
    keywords: ["review", "start", "daily", "clear inbox"],
  },
  {
    id: "action-weekly-review", group: "action", icon: CalendarDays,
    label: "Start Weekly Review", desc: "End-of-week brain sweep",
    action: (nav, { closeCommandPalette }) => { nav("/review/weekly"); closeCommandPalette(); },
    keywords: ["weekly review", "week", "sweep"],
  },
  {
    id: "action-voice", group: "action", icon: BookOpen,
    label: "Voice Capture", desc: "Capture hands-free with your mic",
    action: (nav, { closeCommandPalette }) => { nav("/voice"); closeCommandPalette(); },
    keywords: ["voice", "mic", "speak", "audio", "record"],
  },
  {
    id: "action-ai-chat", group: "action", icon: BrainCircuit,
    label: "Ask AI", desc: "Search your second brain with AI",
    action: (nav, { closeCommandPalette }) => { nav("/ai-chat"); closeCommandPalette(); },
    keywords: ["ask", "ai", "question", "search brain"],
  },
];

// ── Group labels ──────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<Command["group"], string> = {
  navigate: "Navigate",
  action:   "Actions",
  create:   "Create",
};

// ── Fuzzy filter ──────────────────────────────────────────────────────────────

function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;
  const q = query.toLowerCase();
  return commands.filter((c) => {
    return (
      c.label.toLowerCase().includes(q) ||
      (c.desc ?? "").toLowerCase().includes(q) ||
      (c.keywords ?? []).some((k) => k.includes(q))
    );
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCapture: () => void;
}

export default function CommandPalette({ open, onOpenChange, onOpenCapture }: Props) {
  const navigate      = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef      = useRef<HTMLInputElement>(null);
  const listRef       = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) { setQuery(""); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const helpers: Helpers = useMemo(() => ({
    openCapture: onOpenCapture,
    closeCommandPalette: () => onOpenChange(false),
  }), [onOpenCapture, onOpenChange]);

  const filtered = useMemo(() => filterCommands(COMMANDS, query), [query]);

  // Grouped for rendering
  const groups = useMemo(() => {
    const map = new Map<Command["group"], Command[]>();
    for (const cmd of filtered) {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group)!.push(cmd);
    }
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => filtered, [filtered]);

  const runCommand = useCallback((cmd: Command) => {
    cmd.action(navigate, helpers);
  }, [navigate, helpers]);

  // Keyboard navigation inside the list
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = flatList[selected];
      if (cmd) runCommand(cmd);
    }
  }, [flatList, selected, runCommand]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Reset selection when filter changes
  useEffect(() => { setSelected(0); }, [query]);

  // Dynamic "Ask AI" entry when user types a question
  const showAskAI = query.trim().length > 3 && !query.startsWith("/");

  let globalIdx = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl shadow-2xl border border-border/60"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, pages, actions…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="text-[10px] text-muted-foreground/50 border border-border rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
          {flatList.length === 0 && !showAskAI ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No commands match "{query}"
            </div>
          ) : (
            <>
              {/* Ask AI dynamic entry */}
              {showAskAI && (() => {
                const idx = globalIdx++;
                const isSelected = selected === idx;
                return (
                  <div key="ask-ai-dynamic" className="px-2 mb-1">
                    <button
                      data-idx={idx}
                      onClick={() => { navigate(`/ai-chat?q=${encodeURIComponent(query)}`); onOpenChange(false); }}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                        <BrainCircuit className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Ask AI: <span className="text-primary">"{query}"</span></p>
                        <p className="text-[11px] text-muted-foreground">Search your second brain with this question</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  </div>
                );
              })()}

              {/* Grouped commands */}
              {[...groups.entries()].map(([group, cmds]) => (
                <div key={group} className="px-2">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {GROUP_LABELS[group]}
                  </p>
                  {cmds.map((cmd) => {
                    const idx = globalIdx++;
                    const isSelected = selected === (showAskAI ? idx + 1 : idx);
                    // Offset by 1 if the dynamic AI row is shown
                    const adjustedIdx = showAskAI ? idx + 1 : idx;
                    return (
                      <button
                        key={cmd.id}
                        data-idx={adjustedIdx}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelected(adjustedIdx)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                          <cmd.icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{cmd.label}</p>
                          {cmd.desc && <p className="text-[11px] text-muted-foreground truncate">{cmd.desc}</p>}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] text-muted-foreground/50 border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/50">
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1 font-mono">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1 font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
