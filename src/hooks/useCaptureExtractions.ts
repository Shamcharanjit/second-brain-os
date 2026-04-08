/**
 * Hook to fetch extraction status/results for attachments in a capture.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ExtractionRow {
  id: string;
  attachment_id: string;
  status: string;
  kind: string;
  extracted_text: string | null;
  summary: string | null;
  error_message: string | null;
  completed_at: string | null;
  updated_at: string;
}

export function useCaptureExtractions(captureId: string | null) {
  const { user } = useAuth();
  const [extractions, setExtractions] = useState<ExtractionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user?.id || !captureId) {
      setExtractions([]);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("capture_attachment_extractions")
      .select("id, attachment_id, status, kind, extracted_text, summary, error_message, completed_at, updated_at")
      .eq("capture_id", captureId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setExtractions(data as ExtractionRow[]);
    }
    setLoading(false);
  }, [user?.id, captureId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { extractions, loading, refetch: fetch };
}
