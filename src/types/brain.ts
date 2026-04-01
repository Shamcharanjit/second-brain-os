export type CaptureCategory = "task" | "idea" | "reminder" | "goal" | "note" | "project" | "follow_up" | "maybe_later";

export type CaptureStatus = "unprocessed" | "processed" | "sent_to_today" | "sent_to_ideas" | "sent_to_projects" | "sent_to_someday" | "sent_to_memory" | "archived";

export type ReviewStatus = "auto_approved" | "needs_review" | "reviewed";

export type UrgencyLevel = "low" | "medium" | "high";
export type EffortLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "high" | "medium" | "needs_review";
export type DueContext = "today" | "tomorrow" | "this_week" | "later" | "none";
export type IdeaStatus = "new" | "explored" | "parked" | "converted_to_project" | "archived";
export type DestinationSuggestion = "today" | "inbox" | "ideas" | "projects" | "someday" | "maybe_later" | "memory";

export interface AIProcessedData {
  title: string;
  summary: string;
  category: CaptureCategory;
  priority_score: number;
  due_date: string | null;
  next_action: string;
  suggested_project: string | null;
  tags: string[];
  urgency: UrgencyLevel;
  effort: EffortLevel;
  confidence: ConfidenceLevel;
  due_context: DueContext;
  destination_suggestion: DestinationSuggestion;
  why_it_matters: string;
  review_reason: string | null;
}

export interface Capture {
  id: string;
  raw_input: string;
  input_type: "text" | "voice";
  created_at: string;
  processed: boolean;
  status: CaptureStatus;
  review_status: ReviewStatus;
  ai_data: AIProcessedData | null;
  reviewed_at: string | null;
  manually_adjusted: boolean;
  is_completed: boolean;
  completed_at: string | null;
  is_pinned_today: boolean;
  idea_status: IdeaStatus;
  converted_to_project_at: string | null;
  source_project_id: string | null;
}
