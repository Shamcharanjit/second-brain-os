/**
 * Client-side attachment upload validation.
 * Validates files before upload against size, type, zero-byte, and duplicate rules.
 */

import {
  resolveFileKind,
  getMaxSizeForKind,
  formatFileSize,
  ALL_SUPPORTED_MIMES,
  MAX_ATTACHMENTS_PER_CAPTURE,
} from "@/lib/attachment-limits";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate a single file against all pre-upload rules. */
export function validateAttachmentFile(file: File): ValidationResult {
  // Zero-byte check
  if (!file.size || file.size === 0) {
    return { valid: false, error: "This file appears to be empty." };
  }

  // MIME type check
  if (!file.type || !ALL_SUPPORTED_MIMES.includes(file.type)) {
    return { valid: false, error: "This file type isn't supported yet." };
  }

  // Per-type size check
  const kind = resolveFileKind(file.type);
  const maxSize = getMaxSizeForKind(kind);
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `This file is too large (max ${formatFileSize(maxSize)} for ${kind} files).`,
    };
  }

  return { valid: true };
}

/** Check if adding more files would exceed the per-capture attachment cap. */
export function validateAttachmentCount(
  currentCount: number,
  addingCount: number
): ValidationResult {
  const total = currentCount + addingCount;
  if (total > MAX_ATTACHMENTS_PER_CAPTURE) {
    return {
      valid: false,
      error: `You can attach up to ${MAX_ATTACHMENTS_PER_CAPTURE} files to a single capture.`,
    };
  }
  return { valid: true };
}

/** Build a simple duplicate key from a File object. */
function fileDuplicateKey(file: File): string {
  return `${file.name}|${file.size}|${file.type}`;
}

/** Check if a file is a duplicate of any already-pending files. */
export function isDuplicateFile(
  file: File,
  existingFiles: { file: File }[]
): boolean {
  const key = fileDuplicateKey(file);
  return existingFiles.some((ef) => fileDuplicateKey(ef.file) === key);
}
