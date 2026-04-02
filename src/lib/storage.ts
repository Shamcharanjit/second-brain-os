/**
 * Storage utilities for capture file uploads.
 * Handles upload, signed URL generation, and file validation.
 */

import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";

// ── Constants ──

export const CAPTURE_UPLOADS_BUCKET = "capture-uploads";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

const ALL_SUPPORTED = Object.values(SUPPORTED_MIME_TYPES).flat();

// ── Helpers ──

/** Resolve a MIME type to a high-level file kind. */
export function resolveFileKind(
  mimeType: string | undefined | null
): "image" | "audio" | "document" | "other" {
  if (!mimeType) return "other";
  for (const [kind, types] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (types.includes(mimeType)) return kind as "image" | "audio" | "document";
  }
  return "other";
}

/** Validate a file against size and type constraints. */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit`,
    };
  }
  if (!ALL_SUPPORTED.includes(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.type}` };
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
