/**
 * Capture search text builder — creates a bounded, searchable string
 * from capture text + attachment file names + extraction results.
 *
 * Used for client-side keyword matching only, not for display.
 */

import type { ExtractionRow } from "@/hooks/useCaptureExtractions";
import type { CaptureAttachment } from "@/lib/uploads";
import type { Capture } from "@/types/brain";

/* ── Limits ─────────────────────────────────────── */
const MAX_SUMMARY_CHARS = 400;
const MAX_EXTRACTED_TEXT_CHARS = 1000;
const MAX_TOTAL_SEARCH_TEXT_CHARS = 5000;

/* ── Helpers ────────────────────────────────────── */

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max);
}

/* ── Attachment search text ─────────────────────── */

export function buildAttachmentSearchText(
  attachments: CaptureAttachment[],
  extractions: ExtractionRow[]
): string {
  const extractionMap = new Map(extractions.map((e) => [e.attachment_id, e]));
  const parts: string[] = [];

  for (const att of attachments) {
    // File name is always searchable
    parts.push(att.file_name);

    const ext = extractionMap.get(att.id);
    if (!ext || ext.status !== "completed") continue;

    if (ext.summary) {
      parts.push(truncate(ext.summary, MAX_SUMMARY_CHARS));
    }
    if (ext.extracted_text) {
      parts.push(truncate(ext.extracted_text, MAX_EXTRACTED_TEXT_CHARS));
    }
  }

  return parts.join(" ");
}

/* ── Full capture search text ───────────────────── */

export function buildCaptureSearchText(
  capture: Capture,
  attachments: CaptureAttachment[],
  extractions: ExtractionRow[]
): string {
  const sections: string[] = [];

  // 1. Original capture text (highest importance)
  if (capture.raw_input?.trim()) {
    sections.push(capture.raw_input);
  }

  // 2. AI title + tags (already indexed in old search, include for completeness)
  if (capture.ai_data?.title) {
    sections.push(capture.ai_data.title);
  }
  if (capture.ai_data?.tags?.length) {
    sections.push(capture.ai_data.tags.join(" "));
  }

  // 3. Attachment-derived content
  if (attachments.length > 0) {
    const attText = buildAttachmentSearchText(attachments, extractions);
    if (attText) {
      sections.push(attText);
    }
  }

  let result = sections.join(" ");

  if (result.length > MAX_TOTAL_SEARCH_TEXT_CHARS) {
    result = result.slice(0, MAX_TOTAL_SEARCH_TEXT_CHARS);
  }

  return result.toLowerCase();
}

/* ── Simple match helper ────────────────────────── */

export function captureMatchesQuery(searchText: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return searchText.includes(q);
}
