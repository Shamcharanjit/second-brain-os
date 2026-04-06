/**
 * Capture enrichment utility — builds a derived AI context string
 * from capture text + attachment extraction results.
 *
 * This is non-destructive: original capture text is never mutated.
 * Enrichment is computed at runtime for AI calls, search, and display.
 */

import type { ExtractionRow } from "@/hooks/useCaptureExtractions";
import type { CaptureAttachment } from "@/lib/uploads";

/* ── Limits ─────────────────────────────────────── */
const MAX_SUMMARY_CHARS = 500;
const MAX_EXTRACTED_TEXT_CHARS = 1200;
const MAX_TOTAL_ENRICHED_CHARS = 6000;

/* ── Helpers ────────────────────────────────────── */

export function truncateText(text: string, max: number): string {
  if (!text || text.length <= max) return text ?? "";
  return text.slice(0, max).trimEnd() + " [truncated]";
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "image": return "Image";
    case "pdf": return "PDF";
    case "audio": return "Audio";
    default: return "File";
  }
}

/* ── Attachment context block ───────────────────── */

export interface AttachmentWithExtraction {
  attachment: CaptureAttachment;
  extraction: ExtractionRow | null;
}

function buildSingleAttachmentContext(item: AttachmentWithExtraction): string | null {
  const { attachment, extraction } = item;
  if (!extraction || extraction.status !== "completed") return null;

  const parts: string[] = [];
  parts.push(`[${kindLabel(extraction.kind)}: ${attachment.file_name}]`);

  if (extraction.summary) {
    parts.push(`Summary: ${truncateText(extraction.summary, MAX_SUMMARY_CHARS)}`);
  }
  if (extraction.extracted_text) {
    parts.push(`Content: ${truncateText(extraction.extracted_text, MAX_EXTRACTED_TEXT_CHARS)}`);
  }

  return parts.join("\n");
}

export function buildCaptureAttachmentContext(
  attachments: CaptureAttachment[],
  extractions: ExtractionRow[]
): string {
  const extractionMap = new Map(extractions.map((e) => [e.attachment_id, e]));

  const blocks: string[] = [];
  for (const att of attachments) {
    const block = buildSingleAttachmentContext({
      attachment: att,
      extraction: extractionMap.get(att.id) ?? null,
    });
    if (block) blocks.push(block);
  }

  return blocks.join("\n\n");
}

/* ── Full enriched context ──────────────────────── */

export interface EnrichedContextResult {
  enrichedContextText: string;
  hasEnrichment: boolean;
  completedExtractionCount: number;
}

export function buildCaptureEnrichedContext(
  captureText: string,
  attachments: CaptureAttachment[],
  extractions: ExtractionRow[]
): EnrichedContextResult {
  const completedExtractions = extractions.filter((e) => e.status === "completed");
  const attachmentContext = buildCaptureAttachmentContext(attachments, extractions);

  const sections: string[] = [];

  if (captureText?.trim()) {
    sections.push(`--- User Capture ---\n${captureText.trim()}`);
  }

  if (attachmentContext) {
    sections.push(`--- Attachment Intelligence ---\n${attachmentContext}`);
  }

  let enrichedContextText = sections.join("\n\n");

  if (enrichedContextText.length > MAX_TOTAL_ENRICHED_CHARS) {
    enrichedContextText = enrichedContextText.slice(0, MAX_TOTAL_ENRICHED_CHARS).trimEnd() + "\n[context truncated]";
  }

  return {
    enrichedContextText,
    hasEnrichment: completedExtractions.length > 0,
    completedExtractionCount: completedExtractions.length,
  };
}

/* ── Future AI input builder (integration point) ── */

export function buildCaptureAIInput(opts: {
  captureText: string;
  enrichedContextText?: string;
}): string {
  return opts.enrichedContextText?.trim() || opts.captureText;
}
