/**
 * Hook to fetch attachment metadata for captures.
 * - useCaptureAttachmentCounts: lightweight counts for list views
 * - useCaptureAttachmentDetails: full rows for detail view
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { CaptureAttachment } from "@/lib/uploads";

/** Map of captureId → attachment count */
export function useCaptureAttachmentCounts(captureIds: string[]) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Filter out local-* IDs — they're not valid UUIDs and don't exist in Supabase
    const remoteIds = captureIds.filter((id) => !id.startsWith("local-"));

    if (!user?.id || remoteIds.length === 0) {
      setCounts({});
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("capture_attachments")
        .select("capture_id")
        .in("capture_id", remoteIds);

      if (cancelled || error || !data) return;

      const map: Record<string, number> = {};
      for (const row of data) {
        map[row.capture_id] = (map[row.capture_id] || 0) + 1;
      }
      setCounts(map);
    })();

    return () => { cancelled = true; };
  }, [user?.id, captureIds.join(",")]);

  return counts;
}

/** Fetch full attachment rows for a single capture (on demand) */
export function useCaptureAttachmentDetails(captureId: string | null) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<CaptureAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    // local-* captures don't exist in Supabase — skip silently
    if (!user?.id || !captureId || captureId.startsWith("local-")) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("capture_attachments")
      .select("*")
      .eq("capture_id", captureId)
      .order("created_at", { ascending: true });

    if (err) {
      setError(err.message);
      setAttachments([]);
    } else {
      setAttachments((data ?? []) as CaptureAttachment[]);
    }
    setLoading(false);
  }, [user?.id, captureId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { attachments, loading, error, refetch: fetch };
}
