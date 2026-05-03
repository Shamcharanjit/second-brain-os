import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Goal, GoalStatus, LifeArea, Milestone } from "@/types/goal";
import { loadState, saveState } from "@/lib/persistence";

const STORAGE_KEY = "insighthalo_goals";

interface GoalContextType {
  goals: Goal[];
  createGoal: (title: string, lifeArea: LifeArea, description?: string, targetDate?: string | null) => Goal;
  updateGoal: (id: string, updates: Partial<Pick<Goal, "title" | "description" | "life_area" | "status" | "target_date" | "notes">>) => void;
  deleteGoal: (id: string) => void;
  addMilestone: (goalId: string, text: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
  linkProject: (goalId: string, projectId: string) => void;
  unlinkProject: (goalId: string, projectId: string) => void;
  getGoalProgress: (goal: Goal) => number;
}

const GoalContext = createContext<GoalContextType | null>(null);

function touch(g: Goal): Goal { return { ...g, last_updated: new Date().toISOString() }; }

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(() => loadState<Goal[]>(STORAGE_KEY, []));
  useEffect(() => { saveState(STORAGE_KEY, goals); }, [goals]);

  const createGoal = useCallback((title: string, lifeArea: LifeArea, description = "", targetDate: string | null = null): Goal => {
    const now = new Date().toISOString();
    const g: Goal = { id: crypto.randomUUID(), title, description, life_area: lifeArea, status: "active", target_date: targetDate, milestones: [], linked_project_ids: [], notes: "", created_at: now, last_updated: now };
    setGoals((prev) => [g, ...prev]);
    return g;
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Pick<Goal, "title" | "description" | "life_area" | "status" | "target_date" | "notes">>) => {
    setGoals((prev) => prev.map((g) => g.id === id ? touch({ ...g, ...updates }) : g));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.map((g) => g.id === id ? touch({ ...g, status: "archived" as GoalStatus }) : g));
  }, []);

  const addMilestone = useCallback((goalId: string, text: string) => {
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g;
      const m: Milestone = { id: crypto.randomUUID(), text, is_completed: false, completed_at: null };
      return touch({ ...g, milestones: [...g.milestones, m] });
    }));
  }, []);

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g;
      return touch({ ...g, milestones: g.milestones.map((m) => m.id === milestoneId ? { ...m, is_completed: !m.is_completed, completed_at: !m.is_completed ? new Date().toISOString() : null } : m) });
    }));
  }, []);

  const removeMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals((prev) => prev.map((g) => g.id === goalId ? touch({ ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) }) : g));
  }, []);

  const linkProject = useCallback((goalId: string, projectId: string) => {
    setGoals((prev) => prev.map((g) => g.id === goalId && !g.linked_project_ids.includes(projectId) ? touch({ ...g, linked_project_ids: [...g.linked_project_ids, projectId] }) : g));
  }, []);

  const unlinkProject = useCallback((goalId: string, projectId: string) => {
    setGoals((prev) => prev.map((g) => g.id === goalId ? touch({ ...g, linked_project_ids: g.linked_project_ids.filter((id) => id !== projectId) }) : g));
  }, []);

  const getGoalProgress = useCallback((goal: Goal): number => {
    if (goal.milestones.length === 0) return goal.status === "completed" ? 100 : 0;
    const done = goal.milestones.filter((m) => m.is_completed).length;
    return Math.round((done / goal.milestones.length) * 100);
  }, []);

  return (
    <GoalContext.Provider value={{ goals, createGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, removeMilestone, linkProject, unlinkProject, getGoalProgress }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error("useGoals must be used within GoalProvider");
  return ctx;
}
