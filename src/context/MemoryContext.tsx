import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { MemoryEntry, MemoryType } from "@/types/memory";
import { saveState, loadState } from "@/lib/persistence";
import { fetchMemories, upsertMemories, syncMemories } from "@/lib/supabase/data-layer";
import { useCloudSync, useCloudHydration } from "@/hooks/useCloudSync";
import { trackEvent } from "@/lib/analytics/ga4";

const STORAGE_KEY = "insighthalo_memory";

interface MemoryContextType {
  memories: MemoryEntry[];
  getMemory: (id: string) => MemoryEntry | undefined;
  createMemory: (data: { title: string; raw_text: string; summary: string; memory_type: MemoryType; tags?: string[]; importance_score?: number; source_capture_id?: string }) => MemoryEntry;
  updateMemory: (id: string, updates: Partial<Pick<MemoryEntry, "title" | "summary" | "raw_text" | "memory_type" | "tags" | "importance_score">>) => void;
  deleteMemory: (id: string) => void;
  togglePin: (id: string) => void;
  archiveMemory: (id: string) => void;
  unarchiveMemory: (id: string) => void;
  markReviewed: (id: string) => void;
  linkProject: (memoryId: string, projectId: string) => void;
  unlinkProject: (memoryId: string, projectId: string) => void;
  linkIdea: (memoryId: string, ideaId: string) => void;
  unlinkIdea: (memoryId: string, ideaId: string) => void;
}

const MemoryContext = createContext<MemoryContextType | null>(null);

const now = () => new Date().toISOString();

function sanitizeMemories(items: MemoryEntry[]): MemoryEntry[] {
  return items
    .filter((item) => !item.id.startsWith("mem-"))
    .map((item) => ({
      ...item,
      linked_project_ids: item.linked_project_ids.filter((id) => !id.startsWith("proj-")),
      source_capture_id: item.source_capture_id?.startsWith("seed-") ? null : item.source_capture_id,
    }));
}

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<MemoryEntry[]>(() => sanitizeMemories(loadState<MemoryEntry[]>(STORAGE_KEY, [])));

  useEffect(() => { saveState(STORAGE_KEY, memories); }, [memories]);

  useCloudHydration(
    memories,
    setMemories,
    STORAGE_KEY,
    async (userId) => sanitizeMemories(await fetchMemories(userId)),
    upsertMemories,
    (d) => d.length === 0,
  );
  useCloudSync(memories, syncMemories);

  const getMemory = useCallback((id: string) => memories.find((m) => m.id === id), [memories]);

  const createMemory = useCallback((data: { title: string; raw_text: string; summary: string; memory_type: MemoryType; tags?: string[]; importance_score?: number; source_capture_id?: string }): MemoryEntry => {
    const ts = now();
    const entry: MemoryEntry = {
      id: crypto.randomUUID(), title: data.title, raw_text: data.raw_text, summary: data.summary,
      memory_type: data.memory_type, tags: data.tags ?? [], created_at: ts, updated_at: ts,
      is_pinned: false, is_archived: false, linked_project_ids: [], linked_idea_ids: [],
      source_capture_id: data.source_capture_id ?? null, last_reviewed_at: null,
      importance_score: data.importance_score ?? 50,
    };
    setMemories((prev) => [entry, ...prev]);
    trackEvent("memory_saved", { memory_type: entry.memory_type });
    return entry;
  }, []);

  const updateMemory = useCallback((id: string, updates: Partial<Pick<MemoryEntry, "title" | "summary" | "raw_text" | "memory_type" | "tags" | "importance_score">>) => {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, ...updates, updated_at: now() } : m));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, is_pinned: !m.is_pinned, updated_at: now() } : m));
  }, []);

  const archiveMemory = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, is_archived: true, updated_at: now() } : m));
  }, []);

  const unarchiveMemory = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, is_archived: false, updated_at: now() } : m));
  }, []);

  const markReviewed = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, last_reviewed_at: now(), updated_at: now() } : m));
  }, []);

  const linkProject = useCallback((memoryId: string, projectId: string) => {
    setMemories((prev) => prev.map((m) => {
      if (m.id !== memoryId || m.linked_project_ids.includes(projectId)) return m;
      return { ...m, linked_project_ids: [...m.linked_project_ids, projectId], updated_at: now() };
    }));
  }, []);

  const unlinkProject = useCallback((memoryId: string, projectId: string) => {
    setMemories((prev) => prev.map((m) => m.id === memoryId ? { ...m, linked_project_ids: m.linked_project_ids.filter((id) => id !== projectId), updated_at: now() } : m));
  }, []);

  const linkIdea = useCallback((memoryId: string, ideaId: string) => {
    setMemories((prev) => prev.map((m) => {
      if (m.id !== memoryId || m.linked_idea_ids.includes(ideaId)) return m;
      return { ...m, linked_idea_ids: [...m.linked_idea_ids, ideaId], updated_at: now() };
    }));
  }, []);

  const unlinkIdea = useCallback((memoryId: string, ideaId: string) => {
    setMemories((prev) => prev.map((m) => m.id === memoryId ? { ...m, linked_idea_ids: m.linked_idea_ids.filter((id) => id !== ideaId), updated_at: now() } : m));
  }, []);

  return (
    <MemoryContext.Provider value={{
      memories, getMemory, createMemory, updateMemory, deleteMemory,
      togglePin, archiveMemory, unarchiveMemory, markReviewed,
      linkProject, unlinkProject, linkIdea, unlinkIdea,
    }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
