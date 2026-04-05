/**
 * Hook to upload pending files as capture attachments after capture creation.
 * Returns a function that uploads files and reports per-file results.
 */

import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadCaptureAttachment } from "@/lib/uploads";
import { triggerAttachmentExtraction } from "@/lib/extraction";
import type { PendingFile } from "@/components/capture/UploadPicker";

export interface UploadResult {
  fileId: string;
  fileName: string;
  success: boolean;
  error?: string;
}

export function useUploadAttachments() {
  const { user } = useAuth();

  const uploadFiles = useCallback(
    async (captureId: string, files: PendingFile[]): Promise<UploadResult[]> => {
      if (!user?.id || files.length === 0) return [];

      const results: UploadResult[] = [];

      for (const pf of files) {
        const { data, error } = await uploadCaptureAttachment(user.id, captureId, pf.file);
        results.push({
          fileId: pf.id,
          fileName: pf.file.name,
          success: !error,
          error: error ?? undefined,
        });

        // Fire-and-forget extraction trigger for successful uploads
        if (data && !error) {
          triggerAttachmentExtraction(data.id, captureId, user.id);
        }
      }

      return results;
    },
    [user?.id]
  );

  return { uploadFiles };
}
