/**
 * Trigger async AI extraction for uploaded attachments.
 * Fire-and-forget — does not block capture UX.
 */

import { supabase } from "@/lib/supabase/client";

/** Trigger extraction for a single attachment (non-blocking). */
export async function triggerAttachmentExtraction(
  attachmentId: string,
  captureId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("process-capture-attachment", {
      body: { attachmentId, captureId, userId },
    });
    if (error) {
      console.warn("Extraction trigger failed for", attachmentId, error.message);
    }
  } catch (err) {
    console.warn("Extraction trigger error:", err);
  }
}

/** Trigger extraction for multiple attachments (non-blocking, parallel). */
export function triggerBatchExtraction(
  attachments: Array<{ attachmentId: string; captureId: string; userId: string }>
): void {
  for (const att of attachments) {
    triggerAttachmentExtraction(att.attachmentId, att.captureId, att.userId);
  }
}
