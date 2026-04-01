export type MemoryType = "note" | "insight" | "decision" | "reference" | "learning" | "quote" | "research" | "sop";

export interface MemoryEntry {
  id: string;
  title: string;
  raw_text: string;
  summary: string;
  memory_type: MemoryType;
  tags: string[];
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  is_archived: boolean;
  linked_project_ids: string[];
  linked_idea_ids: string[];
  source_capture_id: string | null;
  last_reviewed_at: string | null;
  importance_score: number; // 1-100
}
