import {
  AIProcessedData, CaptureCategory, UrgencyLevel, EffortLevel,
  ConfidenceLevel, DueContext, DestinationSuggestion,
} from "@/types/brain";

/* ── Signal dictionaries ── */
const TASK_SIGNALS = ["call", "send", "book", "pay", "buy", "follow up", "check", "confirm", "ask", "reply", "schedule", "submit", "complete", "return", "cancel", "order", "pick up", "drop off", "fix", "finish", "email", "write", "prepare", "review", "update", "set up", "arrange", "organize", "clean", "file", "register", "renew", "sign"];
const REMINDER_SIGNALS = ["remind me", "don't forget", "dont forget", "remember to", "tomorrow", "today", "next week", "by friday", "by monday", "meeting", "appointment", "deadline", "due", "at noon", "at 3", "this afternoon", "this evening", "this morning", "end of day", "eod", "before"];
const IDEA_SIGNALS = ["what if", "idea:", "maybe build", "launch", "product", "business", "app", "tool", "service", "could we", "imagine", "explore", "brainstorm", "pivot", "experiment", "concept", "strategy", "we should try", "how about", "wouldn't it be", "vision for"];
const PROJECT_SIGNALS = ["create system", "build workflow", "setup process", "improve pipeline", "automate", "dashboard", "crm", "reporting", "migrate", "refactor", "implement", "redesign", "overhaul", "roadmap"];
const MAYBE_LATER_SIGNALS = ["someday", "later", "eventually", "not now", "park this", "low priority", "when i have time", "would be nice", "not urgent", "back burner", "no rush"];
const FOLLOW_UP_SIGNALS = ["follow up", "check in", "waiting on", "pending", "get back", "circle back", "touch base", "hear back", "waiting for", "chase", "ping", "nudge"];

const URGENCY_HIGH = ["urgent", "asap", "critical", "immediately", "right now", "today", "emergency", "time-sensitive", "before end of day", "eod"];
const URGENCY_MED = ["tomorrow", "this week", "soon", "important", "must", "need to", "should", "next few days"];

/* ── Matching helper ── */
function matchCount(text: string, signals: string[]): number {
  let count = 0;
  for (const s of signals) if (text.includes(s)) count++;
  return count;
}

/* ── Category classification ── */
function inferCategory(text: string): { category: CaptureCategory; confidence: ConfidenceLevel } {
  const lower = text.toLowerCase();

  const scores: Record<CaptureCategory, number> = {
    task: matchCount(lower, TASK_SIGNALS),
    reminder: matchCount(lower, REMINDER_SIGNALS),
    idea: matchCount(lower, IDEA_SIGNALS),
    project_note: matchCount(lower, PROJECT_SIGNALS),
    follow_up: matchCount(lower, FOLLOW_UP_SIGNALS),
    maybe_later: matchCount(lower, MAYBE_LATER_SIGNALS),
  };

  // Boost reminder if temporal signals present
  if (scores.reminder > 0 && scores.task > 0) scores.reminder += 1;

  const entries = Object.entries(scores) as [CaptureCategory, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topCat, topScore] = entries[0];
  const secondScore = entries[1][1];

  if (topScore === 0) {
    // No signal matched — use fallbacks
    if (lower.includes("?")) return { category: "idea", confidence: "needs_review" };
    if (lower.length < 25) return { category: "task", confidence: "needs_review" };
    return { category: "project_note", confidence: "needs_review" };
  }

  // If the gap is clear, high confidence
  if (topScore >= 2 && topScore - secondScore >= 2) return { category: topCat, confidence: "high" };
  if (topScore >= 2) return { category: topCat, confidence: "medium" };
  if (topScore === 1 && secondScore === 0) return { category: topCat, confidence: "medium" };
  return { category: topCat, confidence: "needs_review" };
}

/* ── Priority ── */
function inferPriority(text: string, category: CaptureCategory): number {
  let score = 5;
  const lower = text.toLowerCase();
  if (matchCount(lower, URGENCY_HIGH) > 0) score += 3;
  if (matchCount(lower, URGENCY_MED) > 0) score += 1;
  if (lower.includes("important") || lower.includes("must")) score += 2;
  if (category === "task") score += 1;
  if (category === "reminder") score += 2;
  if (category === "follow_up") score += 1;
  if (category === "maybe_later") score -= 3;
  if (category === "idea") score -= 1;
  // Length heuristic: longer = more thought = slightly higher
  if (lower.length > 80) score += 1;
  return Math.min(10, Math.max(1, score));
}

/* ── Urgency ── */
function inferUrgency(text: string, priority: number): UrgencyLevel {
  const lower = text.toLowerCase();
  if (matchCount(lower, URGENCY_HIGH) > 0 || priority >= 8) return "high";
  if (matchCount(lower, URGENCY_MED) > 0 || priority >= 6) return "medium";
  return "low";
}

/* ── Effort ── */
function inferEffort(text: string, category: CaptureCategory): EffortLevel {
  const lower = text.toLowerCase();
  if (category === "idea" || category === "project_note") return "high";
  if (lower.includes("quick") || lower.includes("just") || lower.includes("simple")) return "low";
  if (["call", "reply", "confirm", "send", "email"].some((w) => lower.includes(w))) return "low";
  if (["build", "create", "design", "implement", "plan", "research", "prepare"].some((w) => lower.includes(w))) return "high";
  return "medium";
}

/* ── Due context ── */
function inferDueContext(text: string): DueContext {
  const lower = text.toLowerCase();
  if (lower.includes("today") || lower.includes("now") || lower.includes("eod") || lower.includes("this morning") || lower.includes("this afternoon")) return "today";
  if (lower.includes("tomorrow")) return "tomorrow";
  if (lower.includes("this week") || lower.includes("by friday") || lower.includes("by monday") || lower.includes("next few days")) return "this_week";
  if (lower.includes("next week") || lower.includes("next month") || lower.includes("later") || lower.includes("someday")) return "later";
  return "none";
}

/* ── Due date ── */
function inferDueDate(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes("today")) return now.toISOString().split("T")[0];
  if (lower.includes("tomorrow")) { now.setDate(now.getDate() + 1); return now.toISOString().split("T")[0]; }
  if (lower.includes("next week") || lower.includes("by monday")) { now.setDate(now.getDate() + 7); return now.toISOString().split("T")[0]; }
  if (lower.includes("by friday")) { const day = now.getDay(); const diff = (5 - day + 7) % 7 || 7; now.setDate(now.getDate() + diff); return now.toISOString().split("T")[0]; }
  if (lower.includes("next month")) { now.setMonth(now.getMonth() + 1); return now.toISOString().split("T")[0]; }
  return null;
}

/* ── Destination ── */
function inferDestination(category: CaptureCategory, urgency: UrgencyLevel, confidence: ConfidenceLevel): DestinationSuggestion {
  if (confidence === "needs_review") return "inbox";
  if (category === "maybe_later") return "maybe_later";
  if (category === "idea") return "ideas";
  if (urgency === "high") return "today";
  if (category === "task" && urgency === "medium") return "today";
  if (category === "reminder") return "today";
  if (category === "follow_up" && urgency !== "low") return "today";
  return "inbox";
}

/* ── Title ── */
function generateTitle(text: string): string {
  const cleaned = text.replace(/^(i need to|i want to|i should|please|hey|remind me to|remember to|idea:|note:|todo:)\s+/i, "");
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return (words.length < cleaned.length ? words + "…" : words).replace(/^./, (c) => c.toUpperCase());
}

/* ── Summary ── */
function generateSummary(text: string, category: CaptureCategory): string {
  if (text.length <= 100) return text;
  return text.slice(0, 100) + "…";
}

/* ── Next action ── */
function generateNextAction(category: CaptureCategory, text: string, urgency: UrgencyLevel): string {
  const lower = text.toLowerCase();
  const timeQualifier = urgency === "high" ? "today" : urgency === "medium" ? "this week" : "when ready";

  switch (category) {
    case "task":
      if (lower.includes("call")) return `Make the call ${timeQualifier}`;
      if (lower.includes("email") || lower.includes("send") || lower.includes("reply")) return `Draft and send ${timeQualifier}`;
      if (lower.includes("buy") || lower.includes("order") || lower.includes("book")) return `Complete the booking/purchase ${timeQualifier}`;
      if (lower.includes("pay")) return `Process payment ${timeQualifier}`;
      if (lower.includes("schedule") || lower.includes("arrange")) return `Lock in the schedule ${timeQualifier}`;
      return `Complete this task ${timeQualifier}`;
    case "idea":
      if (lower.includes("product") || lower.includes("app") || lower.includes("build")) return "Spend 15 minutes sketching out the concept and key features";
      return "Block 15 minutes to explore this idea and capture key points";
    case "reminder":
      if (lower.includes("meeting")) return "Prepare agenda and set calendar alert";
      if (lower.includes("appointment")) return "Confirm the appointment and set a reminder";
      return "Set a notification so you don't miss it";
    case "project_note":
      return "Create a brief and break it into actionable milestones";
    case "follow_up":
      if (urgency === "high") return "Send a follow-up message today";
      return "Schedule a follow-up check-in within 2 days";
    case "maybe_later":
      return "Review during your next weekly planning session";
  }
}

/* ── Why it matters ── */
function generateWhyItMatters(category: CaptureCategory, priority: number, urgency: UrgencyLevel, text: string): string {
  const lower = text.toLowerCase();

  if (urgency === "high" && priority >= 8) return "Time-sensitive and high impact — delaying could cause issues.";
  if (urgency === "high") return "This looks time-sensitive, so it was prioritized for Today.";

  if (category === "follow_up") return "Depends on an external response — following up keeps momentum alive.";
  if (category === "reminder" && priority >= 7) return "Missing this could affect your schedule or commitments.";
  if (category === "reminder") return "A timely reminder to keep your commitments on track.";

  if (category === "idea" && priority >= 7) return "This appears to be a high-potential opportunity worth exploring soon.";
  if (category === "idea") return "An interesting opportunity — routed to Ideas Vault for future review.";

  if (category === "maybe_later") return "Low urgency — stored for when you have bandwidth to revisit.";

  if (category === "project_note") return "This looks like a bigger initiative — break it into steps when ready.";

  if (priority >= 7) return "Important for progress — schedule time to handle this soon.";
  if (priority >= 5) return "Worth addressing to keep things moving forward.";
  return "Low-friction item — resolve it when convenient.";
}

/* ── Project inference ── */
function inferProject(text: string, category: CaptureCategory): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("client") || lower.includes("proposal") || lower.includes("contract")) return "Client Work";
  if (lower.includes("investor") || lower.includes("fundrais") || lower.includes("series")) return "Fundraising";
  if (lower.includes("website") || lower.includes("app") || lower.includes("landing") || lower.includes("product")) return "Product Development";
  if (lower.includes("marketing") || lower.includes("campaign") || lower.includes("social") || lower.includes("content")) return "Marketing";
  if (lower.includes("budget") || lower.includes("invoice") || lower.includes("tax") || lower.includes("gst") || lower.includes("accountant")) return "Finance";
  if (lower.includes("hire") || lower.includes("interview") || lower.includes("team")) return "Hiring";
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel") || lower.includes("trip")) return "Travel";
  if (lower.includes("health") || lower.includes("doctor") || lower.includes("dentist") || lower.includes("gym")) return "Personal Health";
  if (lower.includes("automat") || lower.includes("workflow") || lower.includes("system")) return "Operations";
  if (lower.includes("report") || lower.includes("analytics") || lower.includes("data")) return "Business Intelligence";
  if (category === "project_note") return "General Projects";
  return null;
}

/* ── Tags ── */
function generateTags(text: string, category: CaptureCategory, urgency: UrgencyLevel): string[] {
  const tags: string[] = [category.replace("_", " ")];
  const lower = text.toLowerCase();
  if (lower.includes("work") || lower.includes("client") || lower.includes("meeting") || lower.includes("office")) tags.push("work");
  if (lower.includes("personal") || lower.includes("home") || lower.includes("family")) tags.push("personal");
  if (lower.includes("money") || lower.includes("budget") || lower.includes("pay") || lower.includes("invoice")) tags.push("finance");
  if (lower.includes("health") || lower.includes("gym") || lower.includes("doctor") || lower.includes("dentist")) tags.push("health");
  if (urgency === "high") tags.push("urgent");
  if (lower.includes("creative") || lower.includes("design") || lower.includes("idea")) tags.push("creative");
  if (lower.includes("travel") || lower.includes("trip") || lower.includes("flight")) tags.push("travel");
  return [...new Set(tags)];
}

/* ── Main export ── */
export function mockAIProcess(rawInput: string): AIProcessedData {
  const { category, confidence } = inferCategory(rawInput);
  const priority = inferPriority(rawInput, category);
  const urgency = inferUrgency(rawInput, priority);
  const effort = inferEffort(rawInput, category);
  const dueContext = inferDueContext(rawInput);

  return {
    title: generateTitle(rawInput),
    summary: generateSummary(rawInput, category),
    category,
    priority_score: priority,
    due_date: inferDueDate(rawInput),
    next_action: generateNextAction(category, rawInput, urgency),
    suggested_project: inferProject(rawInput, category),
    tags: generateTags(rawInput, category, urgency),
    urgency,
    effort,
    confidence,
    due_context: dueContext,
    destination_suggestion: inferDestination(category, urgency, confidence),
    why_it_matters: generateWhyItMatters(category, priority, urgency, rawInput),
  };
}
