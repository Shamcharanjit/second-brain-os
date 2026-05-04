/**
 * useDuplicateCheck
 *
 * Detects near-duplicate captures using word-overlap (Jaccard similarity).
 * Returns the best matching capture when similarity ≥ threshold so the UI
 * can warn the user before they submit.
 *
 * Performance note: runs in O(n) over non-archived captures on every
 * debounced text change — well within budget for < 5000 captures.
 */

import { useMemo } from "react";
import { useBrain } from "@/context/BrainContext";
import type { Capture } from "@/types/brain";

export interface DuplicateMatch {
  capture: Capture;
  similarity: number; // 0–1
}

const THRESHOLD = 0.55; // ≥55% word overlap = likely duplicate
const MIN_WORDS = 4;    // don't run check on very short inputs

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2), // skip stop-words like "to", "a", "is"
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Returns the best duplicate match (or null) for the given text.
 * Only checks the most recent 200 non-archived captures for performance.
 */
export function useDuplicateCheck(text: string): DuplicateMatch | null {
  const { captures } = useBrain();

  return useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < MIN_WORDS) return null;

    const inputTokens = tokenise(trimmed);
    const candidates = captures
      .filter((c) => c.status !== "archived" && !c.is_completed)
      .slice(0, 200); // only recent captures

    let best: DuplicateMatch | null = null;

    for (const c of candidates) {
      const captureTokens = tokenise(c.raw_input);
      const sim = jaccard(inputTokens, captureTokens);
      if (sim >= THRESHOLD && (!best || sim > best.similarity)) {
        best = { capture: c, similarity: sim };
      }
    }

    return best;
  }, [text, captures]);
}
