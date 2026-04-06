/**
 * Hook that builds a search index map (captureId → searchable text)
 * for currently loaded captures, including attachment + extraction data.
 *
 * Only fetches extraction data when there's an active search query,
 * to avoid unnecessary DB calls on idle inbox views.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Capture } from "@/types/brain";
import type { CaptureAttachment } from "@/lib/uploads";
import { buildCaptureSearchText, captureMatchesQuery } from "@/lib/capture-search-text";
import { findCaptureSearchMatch, type CaptureSearchMatchResult } from "@/lib/capture-search-match";

/** Extended extraction row with capture_id for indexing */
interface SearchExtractionRow {
  id: string;
  attachment_id: string;
  capture_id: string;
  status: string;
  kind: string;
  extracted_text: string | null;
  summary: string | null;
  error_message: string | null;
  completed_at: string | null;
}

interface CaptureSearchIndex {
  /** Whether enriched data has been loaded */
  enrichedReady: boolean;
  /** Check if a capture matches the current search query (enriched when available) */
  matches: (capture: Capture, query: string) => boolean;
  /** Get match source + snippet for a capture (memoized per query) */
  getMatchInfo: (capture: Capture, query: string) => CaptureSearchMatchResult | null;
}

export function useCaptureSearchIndex(
  captures: Capture[],
  activeQuery: string
): CaptureSearchIndex {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<CaptureAttachment[]>([]);
  const [extractions, setExtractions] = useState<SearchExtractionRow[]>([]);
  const [enrichedReady, setEnrichedReady] = useState(false);

  const hasQuery = activeQuery.trim().length > 0;
  const captureIds = useMemo(() => captures.map((c) => c.id), [captures]);

  // Fetch attachment + extraction data only when search is active
  useEffect(() => {
    if (!hasQuery || !user?.id || captureIds.length === 0) {
      setEnrichedReady(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const [attRes, extRes] = await Promise.all([
        supabase
          .from("capture_attachments")
          .select("id, capture_id, file_name, file_kind, mime_type, storage_path, bucket, file_size, status, metadata, user_id, created_at, updated_at, extracted_text")
          .in("capture_id", captureIds),
        supabase
          .from("capture_attachment_extractions")
          .select("id, attachment_id, capture_id, status, kind, extracted_text, summary, error_message, completed_at")
          .in("capture_id", captureIds)
          .eq("status", "completed"),
      ]);

      if (cancelled) return;

      setAttachments((attRes.data ?? []) as CaptureAttachment[]);
      setExtractions((extRes.data ?? []) as SearchExtractionRow[]);
      setEnrichedReady(true);
    })();

    return () => { cancelled = true; };
  }, [hasQuery, user?.id, captureIds.join(",")]);

  // Build search text index (memoized)
  const searchTextMap = useMemo(() => {
    if (!hasQuery) return new Map<string, string>();

    const attByCaptureId = new Map<string, CaptureAttachment[]>();
    for (const att of attachments) {
      const list = attByCaptureId.get(att.capture_id) ?? [];
      list.push(att);
      attByCaptureId.set(att.capture_id, list);
    }

    const extByCaptureId = new Map<string, SearchExtractionRow[]>();
    for (const ext of extractions) {
      const list = extByCaptureId.get(ext.capture_id) ?? [];
      list.push(ext);
      extByCaptureId.set(ext.capture_id, list);
    }

    const map = new Map<string, string>();
    for (const capture of captures) {
      const capAtts = attByCaptureId.get(capture.id) ?? [];
      const capExts = extByCaptureId.get(capture.id) ?? [];
      map.set(capture.id, buildCaptureSearchText(capture, capAtts, capExts));
    }
    return map;
  }, [captures, attachments, extractions, hasQuery]);

  const matches = useMemo(() => {
    return (capture: Capture, query: string): boolean => {
      if (!query.trim()) return true;
      const searchText = searchTextMap.get(capture.id);
      if (searchText) {
        return captureMatchesQuery(searchText, query);
      }
      const q = query.toLowerCase();
      return (
        capture.raw_input.toLowerCase().includes(q) ||
        (capture.ai_data?.title?.toLowerCase().includes(q) ?? false) ||
        (capture.ai_data?.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      );
    };
  }, [searchTextMap]);

  // Match info — memoized cache to avoid recomputation per render
  const matchInfoCache = useMemo(() => new Map<string, CaptureSearchMatchResult | null>(), [activeQuery, attachments, extractions]);

  const getMatchInfo = useCallback(
    (capture: Capture, query: string): CaptureSearchMatchResult | null => {
      if (!query.trim()) return null;
      const cacheKey = capture.id;
      if (matchInfoCache.has(cacheKey)) return matchInfoCache.get(cacheKey)!;
      const result = findCaptureSearchMatch(capture, query, attachments, extractions);
      matchInfoCache.set(cacheKey, result);
      return result;
    },
    [attachments, extractions, matchInfoCache]
  );

  return { enrichedReady, matches, getMatchInfo };
}
