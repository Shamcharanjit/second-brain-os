import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Project, ProjectStatus, ProjectPriority, ProjectHealth, NextAction, ProjectNote, ProjectEvent } from "@/types/project";
import { saveState, loadState } from "@/lib/persistence";
import { fetchProjects, upsertProjects, syncProjects } from "@/lib/supabase/data-layer";
import { useCloudSync, useCloudHydration } from "@/hooks/useCloudSync";
import { trackEvent } from "@/lib/analytics/ga4";

const STORAGE_KEY = "insighthalo_projects";

function makeEvent(type: ProjectEvent["type"], description: string): ProjectEvent {
  return { id: crypto.randomUUID(), type, description, timestamp: new Date().toISOString() };
}

function makeAction(text: string, primary = false): NextAction {
  return { id: crypto.randomUUID(), text, is_primary: primary, is_completed: false, completed_at: null, created_at: new Date().toISOString(), sent_to_today: false };
}

function computeHealth(p: Project): ProjectHealth {
  if (p.status === "completed" || p.status === "archived") return "healthy";
  const hoursSinceUpdate = (Date.now() - new Date(p.last_updated).getTime()) / 3600000;
  const hasNextAction = p.next_actions.some((a) => !a.is_completed);
  if (!hasNextAction && hoursSinceUpdate > 48) return "stalled";
  if (!hasNextAction || hoursSinceUpdate > 72) return "at_risk";
  if (hoursSinceUpdate > 120) return "stalled";
  return "healthy";
}

function sanitizeProjects(items: Project[]): Project[] {
  return items
    .filter((item) => !item.id.startsWith("proj-"))
    .map((item) => ({
      ...item,
      linked_capture_ids: item.linked_capture_ids.filter((id) => !id.startsWith("seed-")),
    }));
}

interface ProjectContextType {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  getProjectHealth: (p: Project) => ProjectHealth;
  createProject: (name: string, description: string, priority: ProjectPriority, sourceIdeaId?: string) => Project;
  updateProject: (id: string, updates: Partial<Pick<Project, "name" | "description" | "priority" | "status" | "due_date" | "progress">>) => void;
  deleteProject: (id: string) => void;
  addNextAction: (projectId: string, text: string, primary?: boolean) => void;
  completeNextAction: (projectId: string, actionId: string) => void;
  setPrimaryAction: (projectId: string, actionId: string) => void;
  editNextAction: (projectId: string, actionId: string, text: string) => void;
  removeNextAction: (projectId: string, actionId: string) => void;
  markActionSentToToday: (projectId: string, actionId: string) => void;
  addNote: (projectId: string, text: string) => void;
  removeNote: (projectId: string, noteId: string) => void;
  linkCapture: (projectId: string, captureId: string) => void;
  unlinkCapture: (projectId: string, captureId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => sanitizeProjects(loadState<Project[]>(STORAGE_KEY, [])));

  useEffect(() => { saveState(STORAGE_KEY, projects); }, [projects]);

  useCloudHydration(
    projects,
    setProjects,
    STORAGE_KEY,
    async (userId) => sanitizeProjects(await fetchProjects(userId)),
    upsertProjects,
    (d) => d.length === 0,
  );
  useCloudSync(projects, syncProjects);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);
  const getProjectHealth = useCallback((p: Project) => computeHealth(p), []);

  const touch = (p: Project): Project => ({ ...p, last_updated: new Date().toISOString() });

  const createProject = useCallback((name: string, description: string, priority: ProjectPriority, sourceIdeaId?: string): Project => {
    const now = new Date().toISOString();
    const colors = ["--brain-teal", "--brain-blue", "--brain-amber", "--brain-purple", "--brain-rose"];
    const newProj: Project = {
      id: crypto.randomUUID(), name, description, status: "active", priority, progress: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      next_actions: [], notes: [], timeline: [makeEvent("created", "Project created")],
      linked_capture_ids: [], source_idea_id: sourceIdeaId ?? null,
      created_at: now, last_updated: now, due_date: null,
    };
    setProjects((prev) => [newProj, ...prev]);
    trackEvent("project_created", { priority, has_source_idea: !!sourceIdeaId });
    return newProj;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Pick<Project, "name" | "description" | "priority" | "status" | "due_date" | "progress">>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const events = [...p.timeline];
      if (updates.status && updates.status !== p.status) events.push(makeEvent("status_changed", `Status → ${updates.status}`));
      if (updates.priority && updates.priority !== p.priority) events.push(makeEvent("priority_changed", `Priority → ${updates.priority}`));
      return touch({ ...p, ...updates, timeline: events });
    }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.map((p) => p.id === id ? touch({ ...p, status: "archived" as ProjectStatus, timeline: [...p.timeline, makeEvent("status_changed", "Project archived")] }) : p));
  }, []);

  const addNextAction = useCallback((projectId: string, text: string, primary = false) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const action = makeAction(text, primary && !p.next_actions.some((a) => a.is_primary && !a.is_completed));
      return touch({ ...p, next_actions: [...p.next_actions, action], timeline: [...p.timeline, makeEvent("action_added", `Added: ${text}`)] });
    }));
  }, []);

  const completeNextAction = useCallback((projectId: string, actionId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const actions = p.next_actions.map((a) => a.id === actionId ? { ...a, is_completed: true, completed_at: new Date().toISOString() } : a);
      const completed = actions.find((a) => a.id === actionId);
      const total = actions.length;
      const done = actions.filter((a) => a.is_completed).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : p.progress;
      return touch({ ...p, next_actions: actions, progress: Math.max(p.progress, progress), timeline: [...p.timeline, makeEvent("action_completed", `Completed: ${completed?.text ?? "action"}`)] });
    }));
  }, []);

  const setPrimaryAction = useCallback((projectId: string, actionId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      return touch({ ...p, next_actions: p.next_actions.map((a) => ({ ...a, is_primary: a.id === actionId && !a.is_completed })) });
    }));
  }, []);

  const editNextAction = useCallback((projectId: string, actionId: string, text: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      return touch({ ...p, next_actions: p.next_actions.map((a) => a.id === actionId ? { ...a, text } : a) });
    }));
  }, []);

  const removeNextAction = useCallback((projectId: string, actionId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      return touch({ ...p, next_actions: p.next_actions.filter((a) => a.id !== actionId) });
    }));
  }, []);

  const markActionSentToToday = useCallback((projectId: string, actionId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      return touch({ ...p, next_actions: p.next_actions.map((a) => a.id === actionId ? { ...a, sent_to_today: true } : a) });
    }));
  }, []);

  const addNote = useCallback((projectId: string, text: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const note: ProjectNote = { id: crypto.randomUUID(), text, created_at: new Date().toISOString() };
      return touch({ ...p, notes: [note, ...p.notes], timeline: [...p.timeline, makeEvent("note_added", "Note added")] });
    }));
  }, []);

  const removeNote = useCallback((projectId: string, noteId: string) => {
    setProjects((prev) => prev.map((p) => p.id === projectId ? touch({ ...p, notes: p.notes.filter((n) => n.id !== noteId) }) : p));
  }, []);

  const linkCapture = useCallback((projectId: string, captureId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId || p.linked_capture_ids.includes(captureId)) return p;
      return touch({ ...p, linked_capture_ids: [...p.linked_capture_ids, captureId], timeline: [...p.timeline, makeEvent("task_linked", "Capture linked")] });
    }));
  }, []);

  const unlinkCapture = useCallback((projectId: string, captureId: string) => {
    setProjects((prev) => prev.map((p) => p.id === projectId ? touch({ ...p, linked_capture_ids: p.linked_capture_ids.filter((id) => id !== captureId) }) : p));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, getProject, getProjectHealth, createProject, updateProject, deleteProject,
      addNextAction, completeNextAction, setPrimaryAction, editNextAction, removeNextAction, markActionSentToToday,
      addNote, removeNote, linkCapture, unlinkCapture,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider");
  return ctx;
}
