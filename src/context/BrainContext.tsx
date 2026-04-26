import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Capture, CaptureStatus, ReviewStatus, AIProcessedData, IdeaStatus } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";
import { saveState, loadState } from "@/lib/persistence";
import { fetchCaptures, upsertCaptures, syncCaptures } from "@/lib/supabase/data-layer";
import { useCloudSync, useCloudHydration } from "@/hooks/useCloudSync";
import { trackEvent } from "@/lib/analytics/ga4";

const STORAGE_KEY = "insighthalo_brain";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => Capture;
  addCaptureWithAI: (text: string, type: "text" | "voice", aiData: AIProcessedData, reviewStatus: ReviewStatus) => Capture;
  addCaptureFromAction: (data: { text: string; projectId?: string; projectName?: string; actionId?: string }) => Capture;
  updateCaptureStatus: (id: string, status: CaptureStatus) => void;
  updateReviewStatus: (id: string, reviewStatus: ReviewStatus) => void;
  approveCapture: (id: string, targetStatus?: CaptureStatus) => void;
  editAndApproveCapture: (id: string, updates: Partial<AIProcessedData>, targetStatus: CaptureStatus) => void;
  archiveCapture: (id: string) => void;
  routeCapture: (id: string, destination: CaptureStatus) => void;
  completeCapture: (id: string) => void;
  uncompleteCapture: (id: string) => void;
  togglePinToday: (id: string) => void;
  editCaptureAI: (id: string, updates: Partial<AIProcessedData>) => void;
  updateIdeaStatus: (id: string, status: IdeaStatus) => void;
  convertIdeaToProject: (id: string) => void;
  /** Replace AI data on an existing capture (used by re-analyze with enrichment) */
  replaceCaptureAI: (id: string, aiData: AIProcessedData, reviewStatus: ReviewStatus) => void;
}

const BrainContext = createContext<BrainContextType | null>(null);

function autoRouteStatus(destination: string): CaptureStatus {
  switch (destination) {
    case "today": return "sent_to_today";
    case "ideas": return "sent_to_ideas";
    case "projects": return "sent_to_projects";
    case "someday": return "sent_to_someday";
    default: return "unprocessed";
  }
}

function destinationToStatus(dest: string): CaptureStatus {
  switch (dest) {
    case "today": return "sent_to_today";
    case "ideas": return "sent_to_ideas";
    case "projects": return "sent_to_projects";
    case "someday":
    case "maybe_later": return "sent_to_someday";
    case "inbox": return "processed";
    default: return "processed";
  }
}

function sanitizeCaptures(items: Capture[]): Capture[] {
  return items
    .filter((item) => !item.id.startsWith("seed-"))
    .map((item) => ({
      ...item,
      source_project_id: item.source_project_id?.startsWith("proj-") ? null : item.source_project_id,
    }));
}

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<Capture[]>(() => sanitizeCaptures(loadState<Capture[]>(STORAGE_KEY, [])));

  useEffect(() => { saveState(STORAGE_KEY, captures); }, [captures]);

  // Cloud sync
  useCloudHydration(
    captures,
    setCaptures,
    STORAGE_KEY,
    async (userId) => sanitizeCaptures(await fetchCaptures(userId)),
    upsertCaptures,
    (d) => d.length === 0,
  );
  useCloudSync(captures, syncCaptures);

  const addCapture = useCallback((text: string, type: "text" | "voice"): Capture => {
    const { aiData, reviewStatus } = mockAIProcess(text);
    const status = reviewStatus === "needs_review" ? "unprocessed" : autoRouteStatus(aiData.destination_suggestion);
    const newCapture: Capture = {
      id: `local-${crypto.randomUUID()}`,
      cloud_id: null,
      raw_input: text, input_type: type,
      created_at: new Date().toISOString(), processed: true, status,
      review_status: reviewStatus, ai_data: aiData,
      reviewed_at: null, manually_adjusted: false,
      is_completed: false, completed_at: null, is_pinned_today: false,
      idea_status: "new", converted_to_project_at: null,
      source_project_id: null, source_action_id: null,
    };
    setCaptures((prev) => {
      if (prev.length === 0) trackEvent("first_capture", { input_type: type, source: "manual" });
      return [newCapture, ...prev];
    });
    trackEvent("capture_created", { input_type: type, source: "manual" });
    if (type === "voice") trackEvent("voice_capture", { source: "manual" });
    return newCapture;
  }, []);

  const addCaptureWithAI = useCallback((text: string, type: "text" | "voice", preAiData: AIProcessedData, preReviewStatus: ReviewStatus): Capture => {
    const status = preReviewStatus === "needs_review" ? "unprocessed" : autoRouteStatus(preAiData.destination_suggestion);
    const newCapture: Capture = {
      id: `local-${crypto.randomUUID()}`,
      cloud_id: null,
      raw_input: text, input_type: type,
      created_at: new Date().toISOString(), processed: true, status,
      review_status: preReviewStatus, ai_data: preAiData,
      reviewed_at: null, manually_adjusted: false,
      is_completed: false, completed_at: null, is_pinned_today: false,
      idea_status: "new", converted_to_project_at: null,
      source_project_id: null, source_action_id: null,
    };
    setCaptures((prev) => {
      if (prev.length === 0) trackEvent("first_capture", { input_type: type, source: "ai" });
      return [newCapture, ...prev];
    });
    trackEvent("capture_created", { input_type: type, source: "ai" });
    return newCapture;
  }, []);
  const addCaptureFromAction = useCallback((data: { text: string; projectId?: string; projectName?: string; actionId?: string }): Capture => {
    const { aiData } = mockAIProcess(data.text);
    const newCapture: Capture = {
      id: `local-${crypto.randomUUID()}`,
      cloud_id: null,
      raw_input: data.text, input_type: "text",
      created_at: new Date().toISOString(), processed: true,
      status: "sent_to_today",
      review_status: "reviewed",
      ai_data: { ...aiData, destination_suggestion: "today", suggested_project: data.projectName ?? aiData.suggested_project },
      reviewed_at: new Date().toISOString(), manually_adjusted: false,
      is_completed: false, completed_at: null, is_pinned_today: false,
      idea_status: "new", converted_to_project_at: null,
      source_project_id: data.projectId ?? null,
      source_action_id: data.actionId ?? null,
    };
    setCaptures((prev) => [newCapture, ...prev]);
    return newCapture;
  }, []);

  const updateCaptureStatus = useCallback((id: string, status: CaptureStatus) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const updateReviewStatus = useCallback((id: string, reviewStatus: ReviewStatus) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, review_status: reviewStatus } : c)));
  }, []);

  const approveCapture = useCallback((id: string, targetStatus?: CaptureStatus) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const dest = targetStatus ?? destinationToStatus(c.ai_data?.destination_suggestion ?? "inbox");
      return { ...c, status: dest, review_status: "reviewed" as ReviewStatus, reviewed_at: new Date().toISOString() };
    }));
  }, []);

  const editAndApproveCapture = useCallback((id: string, updates: Partial<AIProcessedData>, targetStatus: CaptureStatus) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id || !c.ai_data) return c;
      return { ...c, ai_data: { ...c.ai_data, ...updates }, status: targetStatus, review_status: "reviewed" as ReviewStatus, reviewed_at: new Date().toISOString(), manually_adjusted: true };
    }));
  }, []);

  const archiveCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, status: "archived" as CaptureStatus, review_status: "reviewed" as ReviewStatus, reviewed_at: new Date().toISOString() } : c)));
  }, []);

  const routeCapture = useCallback((id: string, destination: CaptureStatus) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, status: destination, review_status: "reviewed" as ReviewStatus, reviewed_at: new Date().toISOString(), is_pinned_today: false } : c)));
  }, []);

  const completeCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, is_completed: true, completed_at: new Date().toISOString() } : c)));
  }, []);

  const uncompleteCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, is_completed: false, completed_at: null } : c)));
  }, []);

  const togglePinToday = useCallback((id: string) => {
    setCaptures((prev) => {
      const current = prev.find((c) => c.id === id);
      if (!current) return prev;
      const pinned = prev.filter((c) => c.is_pinned_today && c.id !== id);
      if (!current.is_pinned_today && pinned.length >= 3) return prev;
      return prev.map((c) => (c.id === id ? { ...c, is_pinned_today: !c.is_pinned_today } : c));
    });
  }, []);

  const editCaptureAI = useCallback((id: string, updates: Partial<AIProcessedData>) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id || !c.ai_data) return c;
      return { ...c, ai_data: { ...c.ai_data, ...updates }, manually_adjusted: true };
    }));
  }, []);

  const updateIdeaStatus = useCallback((id: string, ideaStatus: IdeaStatus) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (ideaStatus === "archived") return { ...c, idea_status: ideaStatus, status: "archived" as CaptureStatus };
      return { ...c, idea_status: ideaStatus };
    }));
  }, []);

  const convertIdeaToProject = useCallback((id: string) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      return { ...c, idea_status: "converted_to_project" as IdeaStatus, status: "sent_to_projects" as CaptureStatus, converted_to_project_at: new Date().toISOString() };
    }));
  }, []);

  const replaceCaptureAI = useCallback((id: string, aiData: AIProcessedData, reviewStatus: ReviewStatus) => {
    setCaptures((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const status = reviewStatus === "needs_review" ? c.status : autoRouteStatus(aiData.destination_suggestion);
      return { ...c, ai_data: aiData, review_status: reviewStatus, status, processed: true };
    }));
  }, []);

  return (
    <BrainContext.Provider value={{
      captures, addCapture, addCaptureWithAI, addCaptureFromAction, updateCaptureStatus, updateReviewStatus,
      approveCapture, editAndApproveCapture, archiveCapture, routeCapture,
      completeCapture, uncompleteCapture, togglePinToday, editCaptureAI,
      updateIdeaStatus, convertIdeaToProject, replaceCaptureAI,
    }}>
      {children}
    </BrainContext.Provider>
  );
}

export function useBrain() {
  const ctx = useContext(BrainContext);
  if (!ctx) throw new Error("useBrain must be used within BrainProvider");
  return ctx;
}
