export type CaptureCategory = "task" | "idea" | "reminder" | "project_note" | "follow_up" | "maybe_later";

export type CaptureStatus = "unprocessed" | "processed" | "sent_to_today" | "sent_to_ideas" | "archived";

export interface AIProcessedData {
  title: string;
  summary: string;
  category: CaptureCategory;
  priority_score: number;
  due_date: string | null;
  next_action: string;
  suggested_project: string | null;
  tags: string[];
}

export interface Capture {
  id: string;
  raw_input: string;
  input_type: "text" | "voice";
  created_at: string;
  processed: boolean;
  status: CaptureStatus;
  ai_data: AIProcessedData | null;
}
