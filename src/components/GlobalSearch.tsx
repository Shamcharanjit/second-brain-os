/**
 * GlobalSearch — Cmd+K command palette
 *
 * Searches across all captures, projects, memories, and ideas.
 * Also exposes quick-navigation actions and shortcuts.
 *
 * Trigger: Cmd+K (Mac) / Ctrl+K (Windows/Linux) — wired in AppLayout.
 * Can also be opened programmatically via the exported `useGlobalSearch` hook.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Inbox, CalendarDays, FolderKanban, Lightbulb, BrainCircuit,
  Radio, RotateCcw, Settings, Mic, Search, FileText, Brain,
  Hourglass, Tag, ChevronRight,
} from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import type { AIProcessedData } from "@/types/brain";

/* ── Simple fuzzy match: all query words appear (in order) in target ── */
function fuzzyMatch(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const words = query.toLowerCase().trim().split(/\s+/);
  let idx = 0;
  for (const word of words) {
    const pos = t.indexOf(word, idx);
    if (pos === -1) return false;
    idx = pos + word.length;
  }
  return true;
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  return text.slice(0, 80) + (text.length > 80 ? "…" : "");
}

/* ── Quick navigation actions shown when no query ── */
const QUICK_ACTIONS = [
  { label: "Dashboard",      icon: BrainCircuit, to: "/app" },
  { label: "Inbox",          icon: Inbox,        to: "/inbox" },
  { label: "Today",          icon: CalendarDays, to: "/today" },
  { label: "Projects",       icon: FolderKanban, to: "/projects" },
  { label: "Ideas Vault",    icon: Lightbulb,    to: "/ideas" },
  { label: "Someday",        icon: Hourglass,    to: "/someday" },
  { label: "Memory",         icon: Brain,        to: "/memory" },
  { label: "Review Rituals", icon: RotateCcw,    to: "/review" },
  { label: "AI Review",      icon: BrainCircuit, to: "/ai-review" },
  { label: "Voice Capture",  icon: Mic,          to: "/voice" },
  { label: "Capture Gateway",icon: Radio,        to: "/capture-gateway" },
  { label: "Settings",       icon: Settings,     to: "/settings" },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();
  const [query, setQuery] = useState("");

  // Reset query when dialog closes
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const go = useCallback((to: string) => {
    navigate(to);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  /* ── Search results ── */
  const captureResults = useMemo(() => {
    if (!query.trim()) return [];
    return captures
      .filter((c) => c.status !== "archived")
      .filter((c) => {
        const ai = c.ai_data as AIProcessedData | null;
        const haystack = [c.raw_input, ai?.title ?? "", ai?.why_it_matters ?? ""].join(" ");
        return fuzzyMatch(haystack, query);
      })
      .slice(0, 6);
  }, [captures, query]);

  const projectResults = useMemo(() => {
    if (!query.trim()) return [];
    return projects
      .filter((p) => p.status !== "archived")
      .filter((p) => fuzzyMatch([p.name, p.description ?? ""].join(" "), query))
      .slice(0, 4);
  }, [projects, query]);

  const memoryResults = useMemo(() => {
    if (!query.trim()) return [];
    return memories
      .filter((m) => !m.is_archived)
      .filter((m) => fuzzyMatch([m.title, m.raw_text, m.summary ?? ""].join(" "), query))
      .slice(0, 4);
  }, [memories, query]);

  const ideaResults = useMemo(() => {
    if (!query.trim()) return [];
    return captures
      .filter((c) => c.status === "sent_to_ideas" && c.status !== "archived")
      .filter((c) => {
        const ai = c.ai_data as AIProcessedData | null;
        return fuzzyMatch([c.raw_input, ai?.title ?? ""].join(" "), query);
      })
      .slice(0, 4);
  }, [captures, query]);

  const hasResults = captureResults.length + projectResults.length + memoryResults.length + ideaResults.length > 0;
  const noQuery = !query.trim();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search captures, projects, memories… or jump to a page"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Empty state */}
        {!noQuery && !hasResults && (
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No results for "{query}"
          </CommandEmpty>
        )}

        {/* Quick actions — shown when no query */}
        {noQuery && (
          <CommandGroup heading="Quick navigation">
            {QUICK_ACTIONS.map((a) => (
              <CommandItem key={a.to} value={a.label} onSelect={() => go(a.to)} className="gap-2">
                <a.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{a.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 ml-auto" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Captures */}
        {captureResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Captures">
              {captureResults.map((c) => {
                const ai = c.ai_data as AIProcessedData | null;
                const title = ai?.title || c.raw_input.slice(0, 60);
                const snippet = highlight(c.raw_input, query);
                const dest = c.status.replace("sent_to_", "").replace("_", " ");
                return (
                  <CommandItem
                    key={c.id}
                    value={`capture-${c.id}-${title}`}
                    onSelect={() => go(`/inbox?q=${encodeURIComponent(query)}`)}
                    className="gap-2 items-start"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{snippet}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 capitalize">{dest}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Projects */}
        {projectResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projectResults.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project-${p.id}-${p.name}`}
                  onSelect={() => go("/projects")}
                  className="gap-2"
                >
                  <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{p.description.slice(0, 60)}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 capitalize">{p.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Ideas */}
        {ideaResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ideas">
              {ideaResults.map((c) => {
                const ai = c.ai_data as AIProcessedData | null;
                const title = ai?.title || c.raw_input.slice(0, 60);
                return (
                  <CommandItem
                    key={c.id}
                    value={`idea-${c.id}-${title}`}
                    onSelect={() => go("/ideas")}
                    className="gap-2"
                  >
                    <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium truncate">{title}</p>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Memories */}
        {memoryResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Memory">
              {memoryResults.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`memory-${m.id}-${m.title}`}
                  onSelect={() => go("/memory")}
                  className="gap-2 items-start"
                >
                  <Brain className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    {m.summary && (
                      <p className="text-[11px] text-muted-foreground truncate">{m.summary.slice(0, 60)}</p>
                    )}
                  </div>
                  <Tag className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/60">
        <span><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">↑↓</kbd> navigate</span>
        <span><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">↵</kbd> open</span>
        <span><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">Esc</kbd> close</span>
      </div>
    </CommandDialog>
  );
}
