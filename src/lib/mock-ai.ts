import { AIProcessedData, CaptureCategory } from "@/types/brain";

const categoryKeywords: Record<string, CaptureCategory> = {
  buy: "task", call: "task", email: "task", fix: "task", finish: "task", send: "task", schedule: "task", do: "task",
  idea: "idea", think: "idea", what_if: "idea", concept: "idea", maybe: "idea", explore: "idea",
  remind: "reminder", remember: "reminder", dont_forget: "reminder", deadline: "reminder",
  note: "project_note", meeting: "project_note", update: "project_note",
  follow: "follow_up", check_in: "follow_up", waiting: "follow_up",
  later: "maybe_later", someday: "maybe_later", eventually: "maybe_later",
};

function inferCategory(text: string): CaptureCategory {
  const lower = text.toLowerCase();
  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (lower.includes(keyword.replace("_", " "))) return cat;
  }
  if (lower.includes("?")) return "idea";
  if (lower.length < 30) return "task";
  return "project_note";
}

function inferPriority(text: string, category: CaptureCategory): number {
  let score = 5;
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("important")) score += 3;
  if (lower.includes("today") || lower.includes("now")) score += 2;
  if (category === "task" || category === "reminder") score += 1;
  if (category === "maybe_later") score -= 2;
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
  if (lower.includes("next week")) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().split("T")[0];
  }
  return null;
}

function generateTitle(text: string): string {
  const words = text.split(" ").slice(0, 6).join(" ");
  return words.length < text.length ? words + "…" : words;
}

function generateNextAction(category: CaptureCategory, text: string): string {
  switch (category) {
    case "task": return "Add to today's task list and complete";
    case "idea": return "Expand on this idea when you have time";
    case "reminder": return "Set a notification for the due date";
    case "project_note": return "File under the relevant project";
    case "follow_up": return "Check back in 2 days";
    case "maybe_later": return "Review during weekly planning";
  }
}

function generateTags(text: string, category: CaptureCategory): string[] {
  const tags: string[] = [category];
  const lower = text.toLowerCase();
  if (lower.includes("work") || lower.includes("client") || lower.includes("meeting")) tags.push("work");
  if (lower.includes("personal") || lower.includes("home")) tags.push("personal");
  if (lower.includes("money") || lower.includes("budget") || lower.includes("pay")) tags.push("finance");
  if (lower.includes("health") || lower.includes("gym") || lower.includes("doctor")) tags.push("health");
  return tags;
}

export function mockAIProcess(rawInput: string): AIProcessedData {
  const category = inferCategory(rawInput);
  return {
    title: generateTitle(rawInput),
    summary: rawInput.length > 80 ? rawInput.slice(0, 80) + "…" : rawInput,
    category,
    priority_score: inferPriority(rawInput, category),
    due_date: inferDueDate(rawInput),
    next_action: generateNextAction(category, rawInput),
    suggested_project: null,
    tags: generateTags(rawInput, category),
  };
}
