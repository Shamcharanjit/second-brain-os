/**
 * Hook that builds a derived enriched context for a capture,
 * combining original text with completed extraction results.
 */

import { useMemo } from "react";
import type { Capture } from "@/types/brain";
import type { CaptureAttachment } from "@/lib/uploads";
import type { ExtractionRow } from "@/hooks/useCaptureExtractions";
import { buildCaptureEnrichedContext, type EnrichedContextResult } from "@/lib/capture-enrichment";

interface UseCaptureEnrichedContextOpts {
  capture: Capture | null;
  attachments: CaptureAttachment[];
  extractions: ExtractionRow[];
}

export function useCaptureEnrichedContext({
  capture,
  attachments,
  extractions,
}: UseCaptureEnrichedContextOpts): EnrichedContextResult & { isReady: boolean } {
  return useMemo(() => {
    if (!capture) {
      return {
        enrichedContextText: "",
        hasEnrichment: false,
        completedExtractionCount: 0,
        isReady: false,
      };
    }

    const result = buildCaptureEnrichedContext(
      capture.raw_input,
      attachments,
      extractions
    );

    return { ...result, isReady: true };
  }, [capture, attachments, extractions]);
}
