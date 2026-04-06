/**
 * Centralized attachment upload limits & configuration for Upload Intelligence V1.
 */

// ── Per-type size limits (bytes) ──
export const MAX_FILE_SIZE_BY_KIND: Record<string, number> = {
  image: 10 * 1024 * 1024,     // 10 MB
  document: 20 * 1024 * 1024,  // 20 MB
  audio: 25 * 1024 * 1024,     // 25 MB
  other: 10 * 1024 * 1024,     // 10 MB fallback
};

// ── Attachment count per capture ──
export const MAX_ATTACHMENTS_PER_CAPTURE = 3;

// ── Supported MIME types (canonical source) ──
export const SUPPORTED_MIME_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg"],
  document: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const ALL_SUPPORTED_MIMES = Object.values(SUPPORTED_MIME_TYPES).flat();

// ── Retry / re-run cooldown ──
export const EXTRACTION_RETRY_COOLDOWN_MS = 15_000; // 15 seconds

// ── Helpers ──

/** Resolve MIME to kind. */
export function resolveFileKind(
  mimeType: string | undefined | null
): "image" | "audio" | "document" | "other" {
  if (!mimeType) return "other";
  for (const [kind, types] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (types.includes(mimeType)) return kind as "image" | "audio" | "document";
  }
  return "other";
}

/** Get max size for a given file kind. */
export function getMaxSizeForKind(kind: string): number {
  return MAX_FILE_SIZE_BY_KIND[kind] ?? MAX_FILE_SIZE_BY_KIND.other;
}

/** Format bytes to human-readable. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
