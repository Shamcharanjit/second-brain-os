/**
 * ScratchpadPage — Personal markdown scratchpad.
 * Route: /scratchpad
 *
 * Auto-saves to localStorage every keystroke.
 * Supports markdown editing + preview via MarkdownEditor.
 */

import { useState, useEffect, useCallback } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Save, Trash2, Clock, Plus } from "lucide-react";
import { loadState, saveState } from "@/lib/persistence";

interface ScratchNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

const STORAGE_KEY = "insighthalo_scratchpad";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ScratchpadPage() {
  const [notes, setNotes] = useState<ScratchNote[]>(() => loadState<ScratchNote[]>(STORAGE_KEY, []));
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = loadState<ScratchNote[]>(STORAGE_KEY, []);
    return saved.length > 0 ? saved[0].id : null;
  });

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  useEffect(() => { saveState(STORAGE_KEY, notes); }, [notes]);

  const createNote = useCallback(() => {
    const n: ScratchNote = { id: crypto.randomUUID(), title: "Untitled note", content: "", updated_at: new Date().toISOString() };
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
  }, []);

  // Create first note automatically
  useEffect(() => {
    if (notes.length === 0) createNote();
  }, []);

  const updateContent = useCallback((content: string) => {
    setNotes((prev) => prev.map((n) => n.id === activeId ? { ...n, content, updated_at: new Date().toISOString() } : n));
  }, [activeId]);

  const updateTitle = useCallback((title: string) => {
    setNotes((prev) => prev.map((n) => n.id === activeId ? { ...n, title, updated_at: new Date().toISOString() } : n));
  }, [activeId]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
    toast("Note deleted");
  }, [activeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Scratchpad</h1>
            <p className="text-xs text-muted-foreground">Quick markdown notes — auto-saved locally</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={createNote}>
          <Plus className="h-3.5 w-3.5" /> New note
        </Button>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-4 min-h-[500px]">
        {/* Sidebar — note list */}
        <div className="space-y-1 md:border-r md:pr-4">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors group ${
                n.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium truncate flex-1">{n.title || "Untitled"}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.updated_at)}</span>
                {n.content && <span className="text-[10px] text-muted-foreground/40">· {n.content.split(/\s+/).length} words</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        {activeNote ? (
          <div className="space-y-3">
            <input
              value={activeNote.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Note title…"
              className="w-full text-xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
            <MarkdownEditor
              value={activeNote.content}
              onChange={updateContent}
              placeholder="Start writing… Markdown is supported."
              minHeight="min-h-[400px]"
            />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Save className="h-3 w-3" />
              <span>Auto-saved {timeAgo(activeNote.updated_at)}</span>
              <span>·</span>
              <span>{activeNote.content.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-center">
            <div className="space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <Button size="sm" onClick={createNote} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Create your first note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
