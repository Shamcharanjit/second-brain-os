/**
 * Hook for safely deleting a capture attachment.
 * Order: storage delete → DB row delete → UI refresh.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CAPTURE_UPLOADS_BUCKET } from "@/lib/storage";
import { toast } from "sonner";
import type { CaptureAttachment } from "@/lib/uploads";

interface UseDeleteCaptureAttachmentReturn {
  deletingId: string | null;
  deleteAttachment: (
    attachment: CaptureAttachment,
    onSuccess?: () => void
  ) => Promise<void>;
}

export function useDeleteCaptureAttachment(): UseDeleteCaptureAttachmentReturn {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteAttachment = useCallback(
    async (attachment: CaptureAttachment, onSuccess?: () => void) => {
      setDeletingId(attachment.id);

      // 1. Delete from storage first
      const { error: storageErr } = await supabase.storage
        .from(CAPTURE_UPLOADS_BUCKET)
        .remove([attachment.storage_path]);

      if (storageErr) {
        setDeletingId(null);
        toast.error("Failed to remove file", {
          description: storageErr.message,
        });
        return;
      }

      // 2. Delete DB row
      const { error: dbErr } = await supabase
        .from("capture_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbErr) {
        setDeletingId(null);
        toast.error("File removed but record cleanup failed", {
          description: "The file was deleted but the database record could not be removed. Please try again.",
        });
        return;
      }

      // 3. Success
      setDeletingId(null);
      toast.success("Attachment removed");
      onSuccess?.();
    },
    []
  );

  return { deletingId, deleteAttachment };
}
