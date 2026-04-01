import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Capture, CaptureStatus, ReviewStatus, AIProcessedData, IdeaStatus } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";
import { saveState, loadState } from "@/lib/persistence";

const STORAGE_KEY = "insighthalo_brain";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => Capture;
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

function makeSeed(id: string, raw: string, type: "text" | "voice", hoursAgo: number, statusOverride?: CaptureStatus): Capture {
  const { aiData, reviewStatus } = mockAIProcess(raw);
  const status = statusOverride ?? autoRouteStatus(aiData.destination_suggestion);
  return {
    id, raw_input: raw, input_type: type,
    created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    processed: true, status, review_status: reviewStatus, ai_data: aiData,
    reviewed_at: null, manually_adjusted: false,
    is_completed: false, completed_at: null, is_pinned_today: false,
    idea_status: "new", converted_to_project_at: null,
    source_project_id: null, source_action_id: null,
  };
}

const SEED_DATA: Capture[] = [
  makeSeed("seed-1", "Call the dentist to reschedule appointment for next week", "text", 1),
  makeSeed("seed-2", "What if we built a mobile app that tracks water intake with smart bottle integration?", "text", 2),
  makeSeed("seed-3", "Remind me to send the Q4 report to Sarah by tomorrow", "voice", 0.5),
  makeSeed("seed-4", "Maybe later: learn Rust programming language for systems work", "text", 3),
  makeSeed("seed-5", "Follow up with Mike about the partnership proposal he mentioned last Friday", "text", 1.5),
  makeSeed("seed-6", "Build a landing page for the new SaaS product launch next month", "text", 4),
  makeSeed("seed-7", "Need to ask accountant about GST issue before end of quarter — urgent", "voice", 0.7),
  makeSeed("seed-8", "Book flight for Toronto trip next month", "text", 1.2),
  makeSeed("seed-9", "What if we offered a free tier with limited captures per month?", "text", 2.5),
  makeSeed("seed-10", "Reply to investor email about Series A timeline today", "voice", 1.7),
  makeSeed("seed-11", "Set up analytics tracking on the new landing page", "text", 5),
  makeSeed("seed-12", "Need to handle that issue with the vendor", "text", 0.3),
  makeSeed("seed-13", "Client proposal maybe next week or the week after", "text", 0.8),
  makeSeed("seed-14", "Need to do something for tax before deadline", "voice", 0.4),
  makeSeed("seed-15", "Goal: grow monthly active users to 10,000 by Q3 this year", "text", 6),
  makeSeed("seed-16", "Note to self: the API rate limit is 1000 requests per minute for the free tier", "text", 3.5),
];

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<Capture[]>(() => loadState(STORAGE_KEY, SEED_DATA));

  useEffect(() => { saveState(STORAGE_KEY, captures); }, [captures]);

  const addCapture = useCallback((text: string, type: "text" | "voice"): Capture => {
    const { aiData, reviewStatus } = mockAIProcess(text);
    const status = reviewStatus === "needs_review" ? "unprocessed" : autoRouteStatus(aiData.destination_suggestion);
    const newCapture: Capture = {
      id: crypto.randomUUID(), raw_input: text, input_type: type,
      created_at: new Date().toISOString(), processed: true, status,
      review_status: reviewStatus, ai_data: aiData,
      reviewed_at: null, manually_adjusted: false,
      is_completed: false, completed_at: null, is_pinned_today: false,
      idea_status: "new", converted_to_project_at: null,
      source_project_id: null, source_action_id: null,
    };
    setCaptures((prev) => [newCapture, ...prev]);
    return newCapture;
  }, []);

  // Create a capture directly routed to Today, e.g. from a project next action
  const addCaptureFromAction = useCallback((data: { text: string; projectId?: string; projectName?: string; actionId?: string }): Capture => {
    const { aiData } = mockAIProcess(data.text);
    const newCapture: Capture = {
      id: crypto.randomUUID(), raw_input: data.text, input_type: "text",
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

  return (
    <BrainContext.Provider value={{
      captures, addCapture, addCaptureFromAction, updateCaptureStatus, updateReviewStatus,
      approveCapture, editAndApproveCapture, archiveCapture, routeCapture,
      completeCapture, uncompleteCapture, togglePinToday, editCaptureAI,
      updateIdeaStatus, convertIdeaToProject,
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
