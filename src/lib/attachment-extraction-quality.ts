/**
 * Attachment extraction quality evaluation — derives a quality band
 * from existing extraction fields using safe heuristics.
 *
 * No ML. No DB migration. Purely derived at runtime.
 */

/* ── Types ──────────────────────────────────────── */

export type ExtractionQualityBand = "high" | "medium" | "low" | "empty" | "unsupported";

export interface ExtractionQualityResult {
  band: ExtractionQualityBand;
  label: string;
  reason: string;
  searchworthy: boolean;
}

interface ExtractionLike {
  status: string;
  kind: string;
  extracted_text: string | null;
  summary: string | null;
}

/* ── Config ─────────────────────────────────────── */

const MIN_TEXT_CHARS_EMPTY = 20;
const MIN_TEXT_CHARS_LOW = 80;
const MIN_TEXT_CHARS_MEDIUM = 250;
const MIN_SUMMARY_CHARS_USEFUL = 30;

/** Ratio of non-alphanumeric chars that signals noisy OCR */
const NOISE_RATIO_THRESHOLD = 0.6;

/* ── Core evaluator ─────────────────────────────── */

export function evaluateExtractionQuality(extraction: ExtractionLike): ExtractionQualityResult {
  // Non-completed states
  if (extraction.status === "unsupported") {
    return { band: "unsupported", label: "Unsupported", reason: "File type not supported for analysis.", searchworthy: false };
  }
  if (extraction.status === "failed") {
    return { band: "empty", label: "Failed", reason: "Analysis failed.", searchworthy: false };
  }
  if (extraction.status === "pending" || extraction.status === "processing") {
    return { band: "empty", label: "Analyzing…", reason: "Analysis in progress.", searchworthy: false };
  }

  // Completed — evaluate content quality
  const text = cleanText(extraction.extracted_text);
  const summary = cleanText(extraction.summary);
  const textLen = text.length;
  const summaryLen = summary.length;

  // Truly empty
  if (textLen < MIN_TEXT_CHARS_EMPTY && summaryLen < MIN_SUMMARY_CHARS_USEFUL) {
    return {
      band: "empty",
      label: "No readable text found",
      reason: emptyReasonByKind(extraction.kind),
      searchworthy: false,
    };
  }

  // Check noise ratio for OCR-type content
  const noisy = textLen > 0 && computeNoiseRatio(text) > NOISE_RATIO_THRESHOLD;

  // Low quality
  if (textLen < MIN_TEXT_CHARS_LOW || noisy) {
    return {
      band: "low",
      label: "Limited quality",
      reason: lowReasonByKind(extraction.kind),
      searchworthy: textLen >= MIN_TEXT_CHARS_EMPTY,
    };
  }

  // Medium
  if (textLen < MIN_TEXT_CHARS_MEDIUM && summaryLen < MIN_SUMMARY_CHARS_USEFUL) {
    return {
      band: "medium",
      label: "Usable",
      reason: "Partial content was extracted successfully.",
      searchworthy: true,
    };
  }

  // High
  return {
    band: "high",
    label: "High confidence",
    reason: "Meaningful content was extracted successfully.",
    searchworthy: true,
  };
}

/* ── Convenience accessors ──────────────────────── */

export function getExtractionQualityLabel(extraction: ExtractionLike): string {
  return evaluateExtractionQuality(extraction).label;
}

export function getExtractionQualityReason(extraction: ExtractionLike): string {
  return evaluateExtractionQuality(extraction).reason;
}

export function isExtractionSearchworthy(extraction: ExtractionLike): boolean {
  return evaluateExtractionQuality(extraction).searchworthy;
}

/* ── Helpers ────────────────────────────────────── */

function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function computeNoiseRatio(text: string): number {
  if (!text) return 0;
  const alphanumeric = text.replace(/[^a-zA-Z0-9\s]/g, "").length;
  return 1 - alphanumeric / text.length;
}

function emptyReasonByKind(kind: string): string {
  switch (kind) {
    case "image": return "No readable text was found in this image.";
    case "audio": return "Audio was processed, but no speech could be transcribed.";
    case "pdf": return "No selectable text could be extracted from this PDF.";
    default: return "No readable content was found in this attachment.";
  }
}

function lowReasonByKind(kind: string): string {
  switch (kind) {
    case "image": return "Limited text was detected. Results may be incomplete.";
    case "audio": return "Audio was processed, but transcript quality appears limited.";
    case "pdf": return "Only limited text could be extracted from this file.";
    default: return "Limited content was extracted. Results may be incomplete.";
  }
}

/* ── Quality band UI config ─────────────────────── */

export const QUALITY_BAND_CONFIG: Record<ExtractionQualityBand, { color: string; icon: "check" | "alert" | "info" | "x" }> = {
  high:        { color: "text-[hsl(var(--brain-teal))]", icon: "check" },
  medium:      { color: "text-[hsl(var(--brain-amber))]", icon: "info" },
  low:         { color: "text-[hsl(var(--brain-amber))]", icon: "alert" },
  empty:       { color: "text-muted-foreground", icon: "x" },
  unsupported: { color: "text-muted-foreground", icon: "x" },
};
