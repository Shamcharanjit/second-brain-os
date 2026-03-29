import { AIProcessedData, CaptureCategory } from "@/types/brain";

const taskVerbs = ["call", "pay", "send", "buy", "go", "check", "fix", "finish", "email", "schedule", "do", "submit", "complete", "return", "cancel", "book", "order", "pick up", "drop off"];
const reminderWords = ["remember", "remind", "meeting", "tomorrow", "today", "dont forget", "deadline", "appointment", "don't forget", "by friday", "by monday", "next week", "due"];
const ideaWords = ["idea", "launch", "business", "plan", "concept", "what if", "explore", "imagine", "strategy", "brainstorm", "pivot", "experiment"];
const maybeLaterWords = ["maybe", "someday", "eventually", "later", "low priority", "not urgent", "when i have time", "would be nice"];
const projectWords = ["project", "build", "create", "develop", "design", "implement", "migrate", "refactor", "ship", "deploy"];
const followUpWords = ["follow up", "check in", "waiting", "pending", "get back", "circle back", "touch base"];

function inferCategory(text: string): CaptureCategory {
  const lower = text.toLowerCase();

  for (const w of followUpWords) if (lower.includes(w)) return "follow_up";
  for (const w of reminderWords) if (lower.includes(w)) return "reminder";
  for (const w of maybeLaterWords) if (lower.includes(w)) return "maybe_later";
  for (const w of projectWords) if (lower.includes(w)) return "project_note";
  for (const w of ideaWords) if (lower.includes(w)) return "idea";
  for (const w of taskVerbs) if (lower.includes(w)) return "task";

  if (lower.includes("?")) return "idea";
  if (lower.length < 30) return "task";
  return "project_note";
}

function inferPriority(text: string, category: CaptureCategory): number {
  let score = 5;
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) score += 3;
  if (lower.includes("important") || lower.includes("must")) score += 2;
  if (lower.includes("today") || lower.includes("now") || lower.includes("immediately")) score += 2;
  if (lower.includes("tomorrow")) score += 1;
  if (category === "task") score += 1;
  if (category === "reminder") score += 2;
  if (category === "follow_up") score += 1;
  if (category === "maybe_later") score -= 3;
  if (category === "idea") score -= 1;
  return Math.min(10, Math.max(1, score));
}

function inferDueDate(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes("today")) return now.toISOString().split("T")[0];
  if (lower.includes("tomorrow")) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().split("T")[0];
  }
  if (lower.includes("next week") || lower.includes("by monday")) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().split("T")[0];
  }
  if (lower.includes("by friday")) {
    const day = now.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    now.setDate(now.getDate() + diff);
    return now.toISOString().split("T")[0];
  }
  return null;
}

function generateTitle(text: string): string {
  // Remove filler words from start
  const cleaned = text.replace(/^(i need to|i want to|i should|please|hey|remind me to|remember to)\s+/i, "");
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return (words.length < cleaned.length ? words + "…" : words)
    .replace(/^./, (c) => c.toUpperCase());
}

function generateNextAction(category: CaptureCategory, text: string): string {
  const lower = text.toLowerCase();
  switch (category) {
    case "task":
      if (lower.includes("call")) return "Make the call today";
      if (lower.includes("email") || lower.includes("send")) return "Draft and send now";
      if (lower.includes("buy") || lower.includes("order")) return "Place the order";
      return "Add to today's task list and complete";
    case "idea":
      return "Block 15 minutes to flesh this out";
    case "reminder":
      if (lower.includes("meeting")) return "Prepare agenda and set calendar alert";
      return "Set a notification for the due date";
    case "project_note":
      return "Create a project brief and outline next steps";
    case "follow_up":
      return "Send a follow-up message in 2 days";
    case "maybe_later":
      return "Review during next weekly planning session";
  }
}

function inferProject(text: string, category: CaptureCategory): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("client") || lower.includes("proposal") || lower.includes("contract")) return "Client Work";
  if (lower.includes("website") || lower.includes("app") || lower.includes("landing")) return "Product Development";
  if (lower.includes("marketing") || lower.includes("campaign") || lower.includes("social")) return "Marketing";
  if (lower.includes("budget") || lower.includes("invoice") || lower.includes("tax")) return "Finance";
  if (lower.includes("hire") || lower.includes("interview") || lower.includes("team")) return "Hiring";
  if (category === "project_note") return "General Projects";
  return null;
}

function generateTags(text: string, category: CaptureCategory): string[] {
  const tags: string[] = [category.replace("_", " ")];
  const lower = text.toLowerCase();
  if (lower.includes("work") || lower.includes("client") || lower.includes("meeting") || lower.includes("office")) tags.push("work");
  if (lower.includes("personal") || lower.includes("home") || lower.includes("family")) tags.push("personal");
  if (lower.includes("money") || lower.includes("budget") || lower.includes("pay") || lower.includes("invoice")) tags.push("finance");
  if (lower.includes("health") || lower.includes("gym") || lower.includes("doctor") || lower.includes("dentist")) tags.push("health");
  if (lower.includes("urgent") || lower.includes("asap")) tags.push("urgent");
  if (lower.includes("creative") || lower.includes("design") || lower.includes("idea")) tags.push("creative");
  return [...new Set(tags)];
}

export function mockAIProcess(rawInput: string): AIProcessedData {
  const category = inferCategory(rawInput);
  return {
    title: generateTitle(rawInput),
    summary: rawInput.length > 120 ? rawInput.slice(0, 120) + "…" : rawInput,
    category,
    priority_score: inferPriority(rawInput, category),
    due_date: inferDueDate(rawInput),
    next_action: generateNextAction(category, rawInput),
    suggested_project: inferProject(rawInput, category),
    tags: generateTags(rawInput, category),
  };
}
