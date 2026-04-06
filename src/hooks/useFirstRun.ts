import { useMemo } from "react";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";

/** Returns true when the user has no meaningful data. */
export function useFirstRun() {
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();
  const { last_daily_review_at, last_weekly_review_at } = useReviewMeta();

  return useMemo(() => {
    const hasReview = !!(last_daily_review_at || last_weekly_review_at);

    return captures.length === 0 && projects.length === 0 && memories.length === 0 && !hasReview;
  }, [captures, projects, memories, last_daily_review_at, last_weekly_review_at]);
}

/** Returns count of user-created items to gauge engagement level. */
export function useEngagementLevel() {
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();

  return useMemo(() => {
    const total = captures.length + projects.length + memories.length;
    return { total, captures: captures.length, projects: projects.length, memories: memories.length };
  }, [captures, projects, memories]);
}
