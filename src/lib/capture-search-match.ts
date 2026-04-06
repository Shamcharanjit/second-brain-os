/**
 * Search match analysis — determines which field matched a search query
 * and builds a short, readable snippet for display in search results.
 */

import type { Capture } from "@/types/brain";
import type { CaptureAttachment } from "@/lib/uploads";

/* ── Types ──────────────────────────────────────── */

export type CaptureSearchMatchSource =
  | "capture_text"
  | "ai_title"
  | "ai_tag"
  | "file_name"
  | "extraction_summary"
  | "extracted_text";

export interface CaptureSearchMatchResult {
  source: CaptureSearchMatchSource;
  label: string;
  snippet: string;
  /** The portion of the snippet that matched (for highlighting) */
  matchTerm: string;
}

interface ExtractionLike {
  attachment_id: string;
  capture_id: string;
  status: string;
  extracted_text: string | null;
  summary: string | null;
}

/* ── Labels ─────────────────────────────────────── */

const SOURCE_LABELS: Record<CaptureSearchMatchSource, string> = {
  capture_text: "Matched in note",
  ai_title: "Matched in title",
  ai_tag: "Matched in tag",
  file_name: "Matched in file",
  extraction_summary: "Matched in AI analysis",
  extracted_text: "Matched in attachment text",
};

/* ── Snippet config ─────────────────────────────── */

const SNIPPET_TARGET_LENGTH = 120;
const SNIPPET_CONTEXT_CHARS = 40;

/* ── Core ───────────────────────────────────────── */

/**
 * Find the best match source and build a display snippet for a capture
 * given a search query. Returns null if no match or empty query.
 */
export function findCaptureSearchMatch(
  capture: Capture,
  query: string,
  attachments: CaptureAttachment[],
  extractions: ExtractionLike[]
): CaptureSearchMatchResult | null {
  if (!query.trim()) return null;
  const q = query.trim().toLowerCase();

  // 1. capture_text
  if (capture.raw_input && capture.raw_input.toLowerCase().includes(q)) {
    return {
      source: "capture_text",
      label: SOURCE_LABELS.capture_text,
      snippet: buildSnippet(capture.raw_input, q),
      matchTerm: query.trim(),
    };
  }

  // 2. ai_title
  if (capture.ai_data?.title?.toLowerCase().includes(q)) {
    return {
      source: "ai_title",
      label: SOURCE_LABELS.ai_title,
      snippet: capture.ai_data.title,
      matchTerm: query.trim(),
    };
  }

  // 3. ai_tag
  const matchedTag = capture.ai_data?.tags?.find((t) => t.toLowerCase().includes(q));
  if (matchedTag) {
    return {
      source: "ai_tag",
      label: SOURCE_LABELS.ai_tag,
      snippet: matchedTag,
      matchTerm: query.trim(),
    };
  }

  // 4. file_name
  const captureAtts = attachments.filter((a) => a.capture_id === capture.id);
  const matchedFile = captureAtts.find((a) => a.file_name.toLowerCase().includes(q));
  if (matchedFile) {
    return {
      source: "file_name",
      label: SOURCE_LABELS.file_name,
      snippet: matchedFile.file_name,
      matchTerm: query.trim(),
    };
  }

  // 5 & 6. extraction summary / extracted text
  const captureExts = extractions.filter(
    (e) => e.capture_id === capture.id && e.status === "completed"
  );

  for (const ext of captureExts) {
    if (ext.summary && ext.summary.toLowerCase().includes(q)) {
      return {
        source: "extraction_summary",
        label: SOURCE_LABELS.extraction_summary,
        snippet: buildSnippet(ext.summary, q),
        matchTerm: query.trim(),
      };
    }
  }

  for (const ext of captureExts) {
    if (ext.extracted_text && ext.extracted_text.toLowerCase().includes(q)) {
      return {
        source: "extracted_text",
        label: SOURCE_LABELS.extracted_text,
        snippet: buildSnippet(ext.extracted_text, q),
        matchTerm: query.trim(),
      };
    }
  }

  return null;
}

/* ── Snippet builder ────────────────────────────── */

function buildSnippet(text: string, query: string): string {
  // Clean whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= SNIPPET_TARGET_LENGTH) return cleaned;

  const lc = cleaned.toLowerCase();
  const idx = lc.indexOf(query.toLowerCase());

  if (idx === -1) {
    // Fallback: start-trimmed
    return cleaned.slice(0, SNIPPET_TARGET_LENGTH).trimEnd() + "…";
  }

  // Center around the match
  const matchEnd = idx + query.length;
  let start = Math.max(0, idx - SNIPPET_CONTEXT_CHARS);
  let end = Math.min(cleaned.length, matchEnd + SNIPPET_CONTEXT_CHARS);

  // Expand to fill target length if room
  const currentLen = end - start;
  if (currentLen < SNIPPET_TARGET_LENGTH) {
    const deficit = SNIPPET_TARGET_LENGTH - currentLen;
    const expandLeft = Math.min(start, Math.floor(deficit / 2));
    const expandRight = Math.min(cleaned.length - end, deficit - expandLeft);
    start -= expandLeft;
    end += expandRight;
  }

  let snippet = cleaned.slice(start, end).trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < cleaned.length) snippet = snippet + "…";

  return snippet;
}

/* ── Highlight helper ───────────────────────────── */

/**
 * Split text into parts for rendering with highlights.
 * Returns alternating [non-match, match, non-match, ...] segments.
 */
export function splitForHighlight(
  text: string,
  query: string
): { text: string; isMatch: boolean }[] {
  if (!query.trim()) return [{ text, isMatch: false }];

  const parts: { text: string; isMatch: boolean }[] = [];
  const lc = text.toLowerCase();
  const qlc = query.trim().toLowerCase();
  let cursor = 0;

  // Find first occurrence only to keep it subtle
  const idx = lc.indexOf(qlc);
  if (idx === -1) return [{ text, isMatch: false }];

  if (idx > 0) parts.push({ text: text.slice(0, idx), isMatch: false });
  parts.push({ text: text.slice(idx, idx + query.trim().length), isMatch: true });
  if (idx + query.trim().length < text.length) {
    parts.push({ text: text.slice(idx + query.trim().length), isMatch: false });
  }

  return parts;
}
