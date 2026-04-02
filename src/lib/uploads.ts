/**
 * Upload orchestration — ties storage operations to the
 * capture_attachments database table.
 */

import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import {
  uploadFile,
  getSignedUrl,
  resolveFileKind,
  validateFile,
  sanitizeFilename,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
} from "@/lib/storage";

// Re-export constants & helpers for convenience
export {
  validateFile,
  resolveFileKind,
  sanitizeFilename,
  getSignedUrl,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
};

export interface CaptureAttachment {
  id: string;
  user_id: string;
  capture_id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  file_kind: string;
  status: string;
  extracted_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Upload a file and record it in capture_attachments.
 * Returns the created attachment row.
 */
export async function uploadCaptureAttachment(
  userId: string,
  captureId: string,
  file: File
): Promise<{ data: CaptureAttachment | null; error?: string }> {
  if (!isSupabaseEnabled) {
    return { data: null, error: "Cloud storage is not configured" };
  }

  // 1. Upload to storage
  const { path, error: uploadErr } = await uploadFile(userId, captureId, file);
  if (uploadErr || !path) {
    return { data: null, error: uploadErr ?? "Upload failed" };
  }

  // 2. Insert DB row
  const fileKind = resolveFileKind(file.type);

  const { data, error: dbErr } = await supabase
    .from("capture_attachments")
    .insert({
      user_id: userId,
      capture_id: captureId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      file_kind: fileKind,
    })
    .select()
    .single();

  if (dbErr) {
    return { data: null, error: dbErr.message };
  }

  return { data: data as CaptureAttachment };
}

/**
 * Get a time-limited signed URL for an attachment.
 */
export async function getSignedCaptureAttachmentUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ url: string; error?: string }> {
  return getSignedUrl(storagePath, expiresIn);
}

/**
 * Fetch all attachments for a given capture.
 */
export async function getAttachmentsForCapture(
  captureId: string
): Promise<{ data: CaptureAttachment[]; error?: string }> {
  if (!isSupabaseEnabled) {
    return { data: [], error: "Cloud storage is not configured" };
  }

  const { data, error } = await supabase
    .from("capture_attachments")
    .select("*")
    .eq("capture_id", captureId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as CaptureAttachment[] };
}
