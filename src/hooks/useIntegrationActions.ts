import { useCallback } from "react";
import { useBrain } from "@/context/BrainContext";
import { useMemory } from "@/context/MemoryContext";
import { useProjects } from "@/context/ProjectContext";
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
 */
export function useIntegrationActions() {
  const { routeCapture, captures } = useBrain();
  const { createMemory, memories } = useMemory();
  const { completeNextAction } = useProjects();

  /** Route a capture to Memory, creating a real MemoryEntry */
  const routeToMemory = useCallback((capture: Capture) => {
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

  /** Sync Today completion back to project next action */
  const syncCompletionToProject = useCallback((capture: Capture) => {
    if (!capture.source_project_id || !capture.source_action_id) return;
    completeNextAction(capture.source_project_id, capture.source_action_id);
  }, [completeNextAction]);

  return { routeToMemory, syncCompletionToProject };
}
