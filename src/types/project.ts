export type ProjectStatus = "active" | "on_hold" | "planning" | "completed" | "archived";
export type ProjectPriority = "critical" | "high" | "medium" | "low";
export type ProjectHealth = "healthy" | "at_risk" | "stalled";

export interface NextAction {
  id: string;
  text: string;
  is_primary: boolean;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  sent_to_today: boolean;
}

export interface ProjectNote {
  id: string;
  text: string;
  created_at: string;
}

export interface ProjectEvent {
  id: string;
  type: "created" | "status_changed" | "priority_changed" | "action_completed" | "action_added" | "idea_linked" | "task_linked" | "note_added" | "paused" | "resumed";
  description: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  next_actions: NextAction[];
  notes: ProjectNote[];
  timeline: ProjectEvent[];
  linked_capture_ids: string[];
  source_idea_id: string | null;
  created_at: string;
  last_updated: string;
  due_date: string | null;
  color: string;
}

export const PROJECT_NAMES = [
  "Client Work",
  "Product Development",
  "Finance & Admin",
  "Growth Experiments",
  "Personal Operations",
  "Marketing",
  "Fundraising",
  "Business Intelligence",
  "Hiring",
  "Travel",
  "Personal Health",
  "Operations",
  "General Projects",
] as const;
