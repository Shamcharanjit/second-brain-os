import { useCallback } from "react";
import { useBrain } from "@/context/BrainContext";
import { useMemory } from "@/context/MemoryContext";
import { Capture } from "@/types/brain";
import { MemoryType } from "@/types/memory";

function captureToMemoryType(capture: Capture): MemoryType {
  const cat = capture.ai_data?.category;
  if (cat === "note") return "note";
  if (cat === "idea") return "insight";
  if (cat === "goal") return "decision";
  return "reference";
}

/**
 * Provides integrated actions that span multiple contexts.
 * Use this instead of calling routeCapture + createMemory separately.
 */
export function useIntegrationActions() {
  const { routeCapture } = useBrain();
  const { createMemory, memories } = useMemory();

  /** Route a capture to Memory, creating a real MemoryEntry */
  const routeToMemory = useCallback((capture: Capture) => {
    // Avoid duplicates from same source capture
    const alreadyExists = memories.some((m) => m.source_capture_id === capture.id);
    if (alreadyExists) {
      routeCapture(capture.id, "sent_to_memory");
      return;
    }

    const ai = capture.ai_data;
    createMemory({
      title: ai?.title || capture.raw_input.slice(0, 60),
      raw_text: capture.raw_input,
      summary: ai?.summary || capture.raw_input,
      memory_type: captureToMemoryType(capture),
      tags: ai?.tags ?? [],
      importance_score: ai?.priority_score ?? 50,
      source_capture_id: capture.id,
    });
    routeCapture(capture.id, "sent_to_memory");
  }, [routeCapture, createMemory, memories]);

  return { routeToMemory };
}
