export type ProjectStatus = "on_track" | "at_risk" | "planning" | "blocked" | "completed";
export type ProjectPriority = "critical" | "high" | "medium" | "low";

export interface ProjectMilestone {
  label: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number; // 0-100
  milestones: ProjectMilestone[];
  nextMilestone: string;
  lastUpdated: string;
  color: string; // CSS variable name e.g. "--brain-teal"
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
