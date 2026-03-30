import React, { createContext, useContext, useState, useCallback } from "react";
import { Capture, CaptureStatus } from "@/types/brain";
import { mockAIProcess } from "@/lib/mock-ai";

interface BrainContextType {
  captures: Capture[];
  addCapture: (text: string, type: "text" | "voice") => void;
  updateCaptureStatus: (id: string, status: CaptureStatus) => void;
}

const BrainContext = createContext<BrainContextType | null>(null);

const SEED_DATA: Capture[] = [
  {
    id: "seed-1", raw_input: "Call the dentist to reschedule appointment for next week",
    input_type: "text", created_at: new Date(Date.now() - 3600000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Reschedule dentist appointment", summary: "Call the dentist to reschedule appointment for next week", category: "task", priority_score: 7, due_date: null, next_action: "Make the call today", suggested_project: null, tags: ["task", "health"] },
  },
  {
    id: "seed-2", raw_input: "What if we built a mobile app that tracks water intake with smart bottle integration?",
    input_type: "text", created_at: new Date(Date.now() - 7200000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Water tracking app with smart bottle…", summary: "What if we built a mobile app that tracks water intake with smart bottle integration?", category: "idea", priority_score: 5, due_date: null, next_action: "Block 15 minutes to flesh this out", suggested_project: "Product Development", tags: ["idea", "creative"] },
  },
  {
    id: "seed-3", raw_input: "Remind me to send the Q4 report to Sarah by tomorrow",
    input_type: "voice", created_at: new Date(Date.now() - 1800000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Send Q4 report to Sarah", summary: "Remind me to send the Q4 report to Sarah by tomorrow", category: "reminder", priority_score: 9, due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], next_action: "Set a notification for the due date", suggested_project: "Client Work", tags: ["reminder", "work", "urgent"] },
  },
  {
    id: "seed-4", raw_input: "Maybe later: learn Rust programming language for systems work",
    input_type: "text", created_at: new Date(Date.now() - 10800000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Learn Rust programming language", summary: "Maybe later: learn Rust programming language for systems work", category: "maybe_later", priority_score: 2, due_date: null, next_action: "Review during next weekly planning session", suggested_project: null, tags: ["maybe later"] },
  },
  {
    id: "seed-5", raw_input: "Follow up with Mike about the partnership proposal he mentioned last Friday",
    input_type: "text", created_at: new Date(Date.now() - 5400000).toISOString(), processed: true, status: "processed",
    ai_data: { title: "Follow up with Mike about partnership…", summary: "Follow up with Mike about the partnership proposal he mentioned last Friday", category: "follow_up", priority_score: 7, due_date: null, next_action: "Send a follow-up message in 2 days", suggested_project: "Client Work", tags: ["follow up", "work"] },
  },
  {
    id: "seed-6", raw_input: "Build a landing page for the new SaaS product launch next month",
    input_type: "text", created_at: new Date(Date.now() - 14400000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Build landing page for SaaS launch", summary: "Build a landing page for the new SaaS product launch next month", category: "project_note", priority_score: 6, due_date: null, next_action: "Create a project brief and outline next steps", suggested_project: "Product Development", tags: ["project note", "creative"] },
  },
  {
    id: "seed-7", raw_input: "Need to ask accountant about GST issue before end of quarter",
    input_type: "voice", created_at: new Date(Date.now() - 2400000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Ask accountant about GST", summary: "Clarify GST reporting requirements with accountant before quarter closes", category: "task", priority_score: 8, due_date: new Date(Date.now() + 604800000).toISOString().split("T")[0], next_action: "Email accountant with specific questions", suggested_project: "Finance", tags: ["task", "finance", "urgent"] },
  },
  {
    id: "seed-8", raw_input: "Book flight for Toronto trip next month",
    input_type: "text", created_at: new Date(Date.now() - 4200000).toISOString(), processed: true, status: "unprocessed",
    ai_data: { title: "Book Toronto flight", summary: "Book flights for upcoming Toronto business trip next month", category: "task", priority_score: 6, due_date: null, next_action: "Compare flight options and book preferred time", suggested_project: "Travel", tags: ["task", "travel"] },
  },
  {
    id: "seed-9", raw_input: "What if we offered a free tier with limited captures per month?",
    input_type: "text", created_at: new Date(Date.now() - 9000000).toISOString(), processed: true, status: "sent_to_ideas",
    ai_data: { title: "Free tier pricing model", summary: "Explore freemium model with limited monthly captures to drive adoption", category: "idea", priority_score: 6, due_date: null, next_action: "Draft pricing comparison table", suggested_project: "Business Strategy", tags: ["idea", "pricing", "growth"] },
  },
  {
    id: "seed-10", raw_input: "Reply to investor email about Series A timeline",
    input_type: "voice", created_at: new Date(Date.now() - 6000000).toISOString(), processed: true, status: "sent_to_today",
    ai_data: { title: "Reply to investor re: Series A", summary: "Respond to investor inquiry about fundraising timeline and milestones", category: "follow_up", priority_score: 9, due_date: new Date().toISOString().split("T")[0], next_action: "Draft reply with updated timeline", suggested_project: "Fundraising", tags: ["follow up", "investor", "urgent"] },
  },
  {
    id: "seed-11", raw_input: "Set up analytics tracking on the new landing page",
    input_type: "text", created_at: new Date(Date.now() - 18000000).toISOString(), processed: true, status: "processed",
    ai_data: { title: "Add analytics to landing page", summary: "Implement event tracking and conversion analytics on the new marketing page", category: "project_note", priority_score: 5, due_date: null, next_action: "Choose analytics tool and add tracking snippet", suggested_project: "Product Development", tags: ["project note", "analytics"] },
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
      status: "unprocessed",
      ai_data: aiData,
    };
    setCaptures((prev) => [newCapture, ...prev]);
  }, []);

  const updateCaptureStatus = useCallback((id: string, status: CaptureStatus) => {
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  }, []);

  return (
    <BrainContext.Provider value={{ captures, addCapture, updateCaptureStatus }}>
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
