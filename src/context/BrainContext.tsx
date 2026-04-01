import React, { createContext, useContext, useState, useCallback } from "react";
import { Capture, CaptureStatus, ReviewStatus } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => Capture;
  updateCaptureStatus: (id: string, status: CaptureStatus) => void;
  updateReviewStatus: (id: string, reviewStatus: ReviewStatus) => void;
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

function seed(id: string, raw: string, type: "text" | "voice", hoursAgo: number, statusOverride?: CaptureStatus): Capture {
  const { aiData, reviewStatus } = mockAIProcess(raw);
  const status = statusOverride ?? autoRouteStatus(aiData.destination_suggestion);
  return {
    id,
    raw_input: raw,
    input_type: type,
    created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    processed: true,
    status,
    review_status: reviewStatus,
    ai_data: aiData,
  };
}

const SEED_DATA: Capture[] = [
  seed("seed-1", "Call the dentist to reschedule appointment for next week", "text", 1),
  seed("seed-2", "What if we built a mobile app that tracks water intake with smart bottle integration?", "text", 2),
  seed("seed-3", "Remind me to send the Q4 report to Sarah by tomorrow", "voice", 0.5),
  seed("seed-4", "Maybe later: learn Rust programming language for systems work", "text", 3),
  seed("seed-5", "Follow up with Mike about the partnership proposal he mentioned last Friday", "text", 1.5),
  seed("seed-6", "Build a landing page for the new SaaS product launch next month", "text", 4),
  seed("seed-7", "Need to ask accountant about GST issue before end of quarter — urgent", "voice", 0.7),
  seed("seed-8", "Book flight for Toronto trip next month", "text", 1.2),
  seed("seed-9", "What if we offered a free tier with limited captures per month?", "text", 2.5),
  seed("seed-10", "Reply to investor email about Series A timeline today", "voice", 1.7),
  seed("seed-11", "Set up analytics tracking on the new landing page", "text", 5),
  seed("seed-12", "Need to handle that issue with the vendor", "text", 0.3),
  seed("seed-13", "Client proposal maybe next week or the week after", "text", 0.8),
  seed("seed-14", "Need to do something for tax before deadline", "voice", 0.4),
  // New categories
  seed("seed-15", "Goal: grow monthly active users to 10,000 by Q3 this year", "text", 6),
  seed("seed-16", "Note to self: the API rate limit is 1000 requests per minute for the free tier", "text", 3.5),
];

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<Capture[]>(SEED_DATA);

  const addCapture = useCallback((text: string, type: "text" | "voice"): Capture => {
    const { aiData, reviewStatus } = mockAIProcess(text);
    const status = reviewStatus === "needs_review" ? "unprocessed" : autoRouteStatus(aiData.destination_suggestion);
    const newCapture: Capture = {
      id: crypto.randomUUID(),
      raw_input: text,
      input_type: type,
      created_at: new Date().toISOString(),
      processed: true,
      status,
      review_status: reviewStatus,
      ai_data: aiData,
    };
    setCaptures((prev) => [newCapture, ...prev]);
    return newCapture;
  }, []);

  const updateCaptureStatus = useCallback((id: string, status: CaptureStatus) => {
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  }, []);

  const updateReviewStatus = useCallback((id: string, reviewStatus: ReviewStatus) => {
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, review_status: reviewStatus } : c))
    );
  }, []);

  return (
    <BrainContext.Provider value={{ captures, addCapture, updateCaptureStatus, updateReviewStatus }}>
      {children}
    </BrainContext.Provider>
  );
}

export function useBrain() {
  const ctx = useContext(BrainContext);
  if (!ctx) {
    throw new Error("useBrain must be used within BrainProvider");
  }
  return ctx;
}
