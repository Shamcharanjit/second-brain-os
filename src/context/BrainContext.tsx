import React, { createContext, useContext, useState, useCallback } from "react";
import { Capture } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => void;
}

const BrainContext = createContext<BrainContextType | null>(null);

const SEED_DATA: Capture[] = [
  {
    id: "seed-1", raw_input: "Call the dentist to reschedule appointment for next week",
    input_type: "text", created_at: new Date(Date.now() - 3600000).toISOString(), processed: true,
    ai_data: { title: "Reschedule dentist appointment", summary: "Call the dentist to reschedule appointment for next week", category: "task", priority_score: 7, due_date: null, next_action: "Add to today's task list and complete", suggested_project: null, tags: ["task", "health"] },
  },
  {
    id: "seed-2", raw_input: "What if we built a mobile app that tracks water intake with smart bottle integration?",
    input_type: "text", created_at: new Date(Date.now() - 7200000).toISOString(), processed: true,
    ai_data: { title: "Water tracking app with…", summary: "What if we built a mobile app that tracks water intake with smart bottle integration?", category: "idea", priority_score: 5, due_date: null, next_action: "Expand on this idea when you have time", suggested_project: null, tags: ["idea", "health"] },
  },
  {
    id: "seed-3", raw_input: "Remind me to send the Q4 report to Sarah by tomorrow",
    input_type: "voice", created_at: new Date(Date.now() - 1800000).toISOString(), processed: true,
    ai_data: { title: "Send Q4 report to Sarah", summary: "Remind me to send the Q4 report to Sarah by tomorrow", category: "reminder", priority_score: 9, due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], next_action: "Set a notification for the due date", suggested_project: null, tags: ["reminder", "work"] },
  },
  {
    id: "seed-4", raw_input: "Maybe later: learn Rust programming language",
    input_type: "text", created_at: new Date(Date.now() - 10800000).toISOString(), processed: true,
    ai_data: { title: "Learn Rust programming language", summary: "Maybe later: learn Rust programming language", category: "maybe_later", priority_score: 3, due_date: null, next_action: "Review during weekly planning", suggested_project: null, tags: ["maybe_later"] },
  },
  {
    id: "seed-5", raw_input: "Follow up with Mike about the partnership proposal he mentioned last Friday",
    input_type: "text", created_at: new Date(Date.now() - 5400000).toISOString(), processed: true,
    ai_data: { title: "Follow up with Mike…", summary: "Follow up with Mike about the partnership proposal he mentioned last Friday", category: "follow_up", priority_score: 7, due_date: null, next_action: "Check back in 2 days", suggested_project: null, tags: ["follow_up", "work"] },
  },
];

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<Capture[]>(SEED_DATA);

  const addCapture = useCallback((text: string, type: "text" | "voice") => {
    const aiData = mockAIProcess(text);
    const newCapture: Capture = {
      id: crypto.randomUUID(),
      raw_input: text,
      input_type: type,
      created_at: new Date().toISOString(),
      processed: true,
      ai_data: aiData,
    };
    setCaptures((prev) => [newCapture, ...prev]);
  }, []);

  return (
    <BrainContext.Provider value={{ captures, addCapture }}>
      {children}
    </BrainContext.Provider>
  );
}

export function useBrain() {
  const ctx = useContext(BrainContext);
  if (!ctx) throw new Error("useBrain must be used within BrainProvider");
  return ctx;
}
