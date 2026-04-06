/**
 * Centralized extraction state derivation helpers.
 * Handles stale detection, missing-row fallback, display state, and recovery messaging.
 */

import type { ExtractionRow } from "@/hooks/useCaptureExtractions";

// ── Stale detection ──

/** Threshold after which pending/processing is considered stale (10 minutes). */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

/** Check if an extraction is stuck in pending/processing. */
export function isExtractionStale(extraction: ExtractionRow): boolean {
  if (extraction.status !== "pending" && extraction.status !== "processing") return false;
  const updatedAt = extraction.updated_at;
  if (!updatedAt) return false;
  const age = Date.now() - new Date(updatedAt).getTime();
  return age > STALE_THRESHOLD_MS;
}

// ── Display state ──

export type ExtractionDisplayState =
  | "pending"
  | "processing"
  | "stale"
  | "completed"
  | "failed"
  | "unsupported"
  | "missing";

/** Derive the display state for an extraction (or missing extraction). */
export function getExtractionDisplayState(
  extraction: ExtractionRow | null | undefined
): ExtractionDisplayState {
  if (!extraction) return "missing";
  if (isExtractionStale(extraction)) return "stale";
  switch (extraction.status) {
    case "pending": return "pending";
    case "processing": return "processing";
    case "completed": return "completed";
    case "failed": return "failed";
    case "unsupported": return "unsupported";
    default: return "missing";
  }
}

// ── Recovery / messaging ──

export function canRetryExtraction(
  extraction: ExtractionRow | null | undefined,
  cooldownActive: boolean
): boolean {
  if (cooldownActive) return false;
  const state = getExtractionDisplayState(extraction);
  return state === "stale" || state === "failed" || state === "missing" || state === "completed";
}

export function getExtractionStatusLabel(state: ExtractionDisplayState): string {
  switch (state) {
    case "pending": return "Pending analysis";
    case "processing": return "Analyzing…";
    case "stale": return "Analysis may be delayed";
    case "completed": return "✓ Analyzed";
    case "failed": return "Analysis failed";
    case "unsupported": return "";
    case "missing": return "Analysis not started";
  }
}

export function getExtractionStatusClassName(state: ExtractionDisplayState): string {
  switch (state) {
    case "pending": return "text-muted-foreground";
    case "processing": return "text-primary animate-pulse";
    case "stale": return "text-yellow-600 dark:text-yellow-500";
    case "completed": return "text-[hsl(var(--brain-teal))]";
    case "failed": return "text-destructive";
    case "missing": return "text-muted-foreground";
    case "unsupported": return "";
  }
}

export function getExtractionRecoveryMessage(state: ExtractionDisplayState): string | null {
  switch (state) {
    case "stale":
      return "Analysis may be taking longer than expected. You can try again.";
    case "missing":
      return "Analysis hasn't started yet. You can run analysis now.";
    default:
      return null;
  }
}
