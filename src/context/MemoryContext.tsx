import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { MemoryEntry, MemoryType } from "@/types/memory";
import { saveState, loadState } from "@/lib/persistence";
import { fetchMemories, upsertMemories, syncMemories } from "@/lib/supabase/data-layer";
import { useCloudSync, useCloudHydration } from "@/hooks/useCloudSync";

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

const SEED_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-1", title: "API Rate Limit Documentation",
    raw_text: "The API rate limit is 1000 requests per minute for the free tier. Premium tier allows 10,000 req/min.",
    summary: "Free tier: 1000 req/min. Premium: 10,000 req/min. Important for capacity planning.",
    memory_type: "reference", tags: ["api", "infrastructure", "pricing"],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    is_pinned: true, is_archived: false,
    linked_project_ids: ["proj-2"], linked_idea_ids: [],
    source_capture_id: "seed-16", last_reviewed_at: null, importance_score: 75,
  },
  {
    id: "mem-2", title: "Series A Timeline Decision",
    raw_text: "Decided to target Q3 for Series A conversations. Need traction metrics by Q2 end.",
    summary: "Series A target: Q3. Must have traction metrics ready by end of Q2.",
    memory_type: "decision", tags: ["fundraising", "timeline", "strategy"],
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    is_pinned: true, is_archived: false,
    linked_project_ids: [], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: null, importance_score: 90,
  },
  {
    id: "mem-3", title: "GST Compliance Requirements",
    raw_text: "Must resolve GST issue before end of quarter. Accountant mentioned new rules for SaaS businesses.",
    summary: "GST compliance deadline is end of quarter. New SaaS-specific rules apply.",
    memory_type: "note", tags: ["finance", "compliance", "deadline"],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    is_pinned: false, is_archived: false,
    linked_project_ids: ["proj-3"], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: null, importance_score: 70,
  },
  {
    id: "mem-4", title: "Free Tier Conversion Insight",
    raw_text: "Industry average free-to-paid conversion is 2-5%. Best-in-class SaaS products achieve 7-10% with strong onboarding.",
    summary: "Free-to-paid benchmarks: avg 2-5%, best 7-10%. Onboarding quality is the key differentiator.",
    memory_type: "insight", tags: ["pricing", "conversion", "benchmarks"],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    is_pinned: false, is_archived: false,
    linked_project_ids: ["proj-4"], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: null, importance_score: 80,
  },
  {
    id: "mem-5", title: "Competitor Analysis: Notion AI",
    raw_text: "Notion AI charges $10/user/month on top of base plan. Focus is on writing assistance rather than capture intelligence.",
    summary: "Notion AI: $10/user/month add-on. Writing-focused, not capture-focused — different positioning opportunity.",
    memory_type: "research", tags: ["competitors", "pricing", "positioning"],
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    is_pinned: false, is_archived: false,
    linked_project_ids: [], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: new Date(Date.now() - 4 * 86400000).toISOString(), importance_score: 65,
  },
  {
    id: "mem-6", title: "\"Ship fast, learn faster\"",
    raw_text: "Ship fast, learn faster. The best products are built by founders who talk to users every single week.",
    summary: "Core operating principle: speed of shipping + weekly user conversations.",
    memory_type: "quote", tags: ["mindset", "product"],
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    is_pinned: true, is_archived: false,
    linked_project_ids: [], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: null, importance_score: 60,
  },
  {
    id: "mem-7", title: "Client Onboarding SOP Draft",
    raw_text: "Step 1: Discovery call. Step 2: Proposal within 48h. Step 3: Kickoff meeting. Step 4: Weekly check-ins for first month.",
    summary: "4-step client onboarding: Discovery → 48h Proposal → Kickoff → Weekly check-ins (month 1).",
    memory_type: "sop", tags: ["clients", "process", "onboarding"],
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    is_pinned: false, is_archived: false,
    linked_project_ids: ["proj-1"], linked_idea_ids: [],
    source_capture_id: null, last_reviewed_at: null, importance_score: 72,
  },
];

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<MemoryEntry[]>(() => loadState(STORAGE_KEY, SEED_MEMORIES));

  useEffect(() => { saveState(STORAGE_KEY, memories); }, [memories]);

  useCloudHydration(memories, setMemories, fetchMemories, upsertMemories, (d) => d.length === 0);
  useCloudSync(memories, upsertMemories);

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
