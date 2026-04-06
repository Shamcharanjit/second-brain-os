/**
 * Storage utilities for capture file uploads.
 * Handles upload, signed URL generation, and file validation.
 */

import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import {
  SUPPORTED_MIME_TYPES,
  ALL_SUPPORTED_MIMES,
  resolveFileKind as resolveKind,
  getMaxSizeForKind,
  MAX_FILE_SIZE_BY_KIND,
} from "@/lib/attachment-limits";

// ── Constants (re-exported for backward compat) ──

export const CAPTURE_UPLOADS_BUCKET = "capture-uploads";

/** @deprecated Use per-type limits from attachment-limits.ts */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export { SUPPORTED_MIME_TYPES };

// ── Helpers ──

/** Resolve a MIME type to a high-level file kind. */
export function resolveFileKind(
  mimeType: string | undefined | null
): "image" | "audio" | "document" | "other" {
  return resolveKind(mimeType);
}

/** Validate a file against per-type size limits and supported types. */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file.size || file.size === 0) {
    return { valid: false, error: "This file appears to be empty." };
  }
  if (!file.type || !ALL_SUPPORTED_MIMES.includes(file.type)) {
    return { valid: false, error: "This file type isn't supported yet." };
  }
  const kind = resolveKind(file.type);
  const maxSize = getMaxSizeForKind(kind);
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large (max ${maxSize / (1024 * 1024)} MB for ${kind} files).`,
    };
  }
  return { valid: true };
}

/** Sanitise a filename for safe storage. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

/** Build the storage path: {userId}/{captureId}/{sanitized filename} */
export function buildStoragePath(
  userId: string,
  captureId: string,
  fileName: string
): string {
  return `${userId}/${captureId}/${sanitizeFilename(fileName)}`;
}

// ── Core operations ──

/**
 * Upload a file to the capture-uploads bucket.
 * Returns the storage path on success.
 */
export async function uploadFile(
  userId: string,
  captureId: string,
  file: File
): Promise<{ path: string; error?: string }> {
  if (!isSupabaseEnabled) {
    return { path: "", error: "Cloud storage is not configured" };
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    return { path: "", error: validation.error };
  }

  const storagePath = buildStoragePath(userId, captureId, file.name);

  const { error } = await supabase.storage
    .from(CAPTURE_UPLOADS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path: storagePath };
}

/**
 * Get a short-lived signed URL for a private file.
 * Default expiry: 1 hour (3600 s).
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ url: string; error?: string }> {
  if (!isSupabaseEnabled) {
    return { url: "", error: "Cloud storage is not configured" };
  }

  const { data, error } = await supabase.storage
    .from(CAPTURE_UPLOADS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    return { url: "", error: error?.message ?? "Failed to create signed URL" };
  }

  return { url: data.signedUrl };
}
