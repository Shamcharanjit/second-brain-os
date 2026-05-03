/**
 * useAllTags — aggregates every unique tag across all non-archived captures.
 * Returns tags sorted by frequency (most-used first).
 */

import { useMemo } from "react";
import { useBrain } from "@/context/BrainContext";
import type { AIProcessedData } from "@/types/brain";

export interface TagWithCount {
  tag: string;
  count: number;
}

export function useAllTags(): TagWithCount[] {
  const { captures } = useBrain();

  return useMemo(() => {
    const freq: Record<string, number> = {};
    for (const c of captures) {
      if (c.status === "archived") continue;
      const ai = c.ai_data as AIProcessedData | null;
      for (const tag of ai?.tags ?? []) {
        if (tag.trim()) freq[tag.trim()] = (freq[tag.trim()] ?? 0) + 1;
      }
    }
    return Object.entries(freq)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [captures]);
}
