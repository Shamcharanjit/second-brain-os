/**
 * AI Triage Service — calls the edge function for real AI triage,
 * falls back to local mock-ai when unavailable.
 */

import { isSupabaseEnabled, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { mockAIProcess } from "@/lib/mock-ai";
import type { AIProcessedData, CaptureCategory, ConfidenceLevel } from "@/types/brain";

/* ── Triage result shape (from AI) ── */
export interface AITriageResult {
  type: "task" | "idea" | "reminder" | "goal" | "note" | "project" | "follow_up" | "maybe_later";
  title: string;
  summary: string;
  recommendedDestination: "today" | "inbox" | "ideas" | "projects" | "memory" | "someday";
  priority: "low" | "medium" | "high";
  shouldAddToToday: boolean;
  suggestedNextAction: string;
  confidence: number;
}

/** Whether real AI triage is available (Supabase configured) */
export function isAITriageAvailable(): boolean {
  return isSupabaseEnabled;
}

/** Call the real AI triage edge function */
async function callAITriage(rawInput: string, enrichedContext?: string): Promise<AITriageResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("AI not configured");
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ rawInput, enrichedContext }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.triage) throw new Error("Invalid response");
  return data.triage as AITriageResult;
}

/* ── Map AI triage result into app's AIProcessedData ── */
function priorityToScore(p: "low" | "medium" | "high"): number {
  return p === "high" ? 80 : p === "medium" ? 55 : 30;
}

function confidenceToLevel(c: number): ConfidenceLevel {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "needs_review";
}

export function triageToAIData(triage: AITriageResult, rawInput: string): AIProcessedData {
  const score = priorityToScore(triage.priority);
  return {
    title: triage.title,
    summary: triage.summary,
    category: triage.type as CaptureCategory,
    priority_score: score,
    due_date: null,
    next_action: triage.suggestedNextAction,
    suggested_project: null,
    tags: [triage.type.replace("_", " ")],
    urgency: triage.priority,
    effort: "medium",
    confidence: confidenceToLevel(triage.confidence),
    due_context: triage.shouldAddToToday ? "today" : "none",
    destination_suggestion: triage.recommendedDestination === "memory"
      ? "inbox"
      : (triage.recommendedDestination as AIProcessedData["destination_suggestion"]),
    why_it_matters: triage.summary,
    review_reason: triage.confidence < 0.5 ? "Low AI confidence — review recommended" : null,
  };
}

/**
 * Run AI triage: tries real AI, falls back to mock.
 * Returns { triage, aiData, source, usedEnrichedContext } where source indicates what was used.
 *
 * @param rawInput - original capture text
 * @param enrichedContext - optional enriched context from buildCaptureAIInput()
 */
export async function runAITriage(
  rawInput: string,
  enrichedContext?: string
): Promise<{
  triage: AITriageResult;
  aiData: AIProcessedData;
  source: "ai" | "local";
  usedEnrichedContext: boolean;
}> {
  const hasEnrichment = !!enrichedContext && enrichedContext !== rawInput;

  // Try real AI first
  if (isAITriageAvailable()) {
    try {
      const triage = await callAITriage(rawInput, hasEnrichment ? enrichedContext : undefined);
      const aiData = triageToAIData(triage, rawInput);
      if (hasEnrichment) {
        console.debug("[AI Triage] Used enriched context for triage");
      }
      return { triage, aiData, source: "ai", usedEnrichedContext: hasEnrichment };
    } catch (err) {
      console.warn("AI triage failed, falling back to local:", err);
    }
  }

  // Fallback to mock
  const { aiData } = mockAIProcess(rawInput);
  const triage: AITriageResult = {
    type: aiData.category,
    title: aiData.title,
    summary: aiData.summary,
    recommendedDestination: aiData.destination_suggestion === "maybe_later"
      ? "someday"
      : (aiData.destination_suggestion as AITriageResult["recommendedDestination"]),
    priority: aiData.urgency,
    shouldAddToToday: aiData.destination_suggestion === "today",
    suggestedNextAction: aiData.next_action,
    confidence: aiData.confidence === "high" ? 0.9 : aiData.confidence === "medium" ? 0.65 : 0.3,
  };
  return { triage, aiData, source: "local", usedEnrichedContext: false };
}
