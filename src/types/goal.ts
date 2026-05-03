export type LifeArea = "work" | "health" | "finance" | "learning" | "relationships" | "creative" | "personal";
export type GoalStatus = "active" | "completed" | "paused" | "archived";

export interface Milestone {
  id: string;
  text: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  life_area: LifeArea;
  status: GoalStatus;
  target_date: string | null;
  milestones: Milestone[];
  linked_project_ids: string[];
  notes: string;           // markdown
  created_at: string;
  last_updated: string;
}

export const LIFE_AREA_CONFIG: Record<LifeArea, { label: string; emoji: string; color: string }> = {
  work:          { label: "Work & Career",    emoji: "💼", color: "--brain-blue" },
  health:        { label: "Health & Fitness",  emoji: "💪", color: "--brain-teal" },
  finance:       { label: "Finance",           emoji: "💰", color: "--brain-amber" },
  learning:      { label: "Learning & Growth", emoji: "📚", color: "--brain-purple" },
  relationships: { label: "Relationships",     emoji: "❤️", color: "--brain-rose" },
  creative:      { label: "Creative",          emoji: "🎨", color: "--brain-purple" },
  personal:      { label: "Personal",          emoji: "🌱", color: "--brain-teal" },
};
