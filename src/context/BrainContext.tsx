import React, { createContext, useContext, useState, useCallback } from "react";
import { Capture, CaptureStatus, ReviewStatus } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => void;
  updateCaptureStatus: (id: string, status: CaptureStatus) => void;
  updateReviewStatus: (id: string, reviewStatus: ReviewStatus) => void;
}

const BrainContext = createContext<BrainContextType | null>(null);

function seed(id: string, raw: string, type: "text" | "voice", hoursAgo: number, status: CaptureStatus): Capture {
  const { aiData, reviewStatus } = mockAIProcess(raw);
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
  seed("seed-1", "Call the dentist to reschedule appointment for next week", "text", 1, "unprocessed"),
  seed("seed-2", "What if we built a mobile app that tracks water intake with smart bottle integration?", "text", 2, "unprocessed"),
  seed("seed-3", "Remind me to send the Q4 report to Sarah by tomorrow", "voice", 0.5, "unprocessed"),
  seed("seed-4", "Maybe later: learn Rust programming language for systems work", "text", 3, "unprocessed"),
  seed("seed-5", "Follow up with Mike about the partnership proposal he mentioned last Friday", "text", 1.5, "processed"),
  seed("seed-6", "Build a landing page for the new SaaS product launch next month", "text", 4, "unprocessed"),
  seed("seed-7", "Need to ask accountant about GST issue before end of quarter — urgent", "voice", 0.7, "unprocessed"),
  seed("seed-8", "Book flight for Toronto trip next month", "text", 1.2, "unprocessed"),
  seed("seed-9", "What if we offered a free tier with limited captures per month?", "text", 2.5, "sent_to_ideas"),
  seed("seed-10", "Reply to investor email about Series A timeline today", "voice", 1.7, "sent_to_today"),
  seed("seed-11", "Set up analytics tracking on the new landing page", "text", 5, "processed"),
  // Additional seeds for richer review queue
  seed("seed-12", "Need to handle that issue with the vendor", "text", 0.3, "unprocessed"),
  seed("seed-13", "Client proposal maybe next week or the week after", "text", 0.8, "unprocessed"),
  seed("seed-14", "Need to do something for tax before deadline", "voice", 0.4, "unprocessed"),
];

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<Capture[]>(SEED_DATA);

  const addCapture = useCallback((text: string, type: "text" | "voice") => {
    const { aiData, reviewStatus } = mockAIProcess(text);
    const newCapture: Capture = {
      id: crypto.randomUUID(),
      raw_input: text,
      input_type: type,
      created_at: new Date().toISOString(),
      processed: true,
      status: "unprocessed",
      review_status: reviewStatus,
      ai_data: aiData,
    };
    setCaptures((prev) => [newCapture, ...prev]);
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
