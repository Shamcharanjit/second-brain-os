import { useMemo } from "react";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";

/** Returns true when the user has no meaningful data (only seed or empty). */
export function useFirstRun() {
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();
  const { last_daily_review_at, last_weekly_review_at } = useReviewMeta();

  return useMemo(() => {
    const userCaptures = captures.filter((c) => !c.id.startsWith("seed-"));
    const userProjects = projects.filter((p) => !p.id.startsWith("proj-"));
    const userMemories = memories.filter((m) => !m.id.startsWith("mem-"));
    const hasReview = !!(last_daily_review_at || last_weekly_review_at);

    return userCaptures.length === 0 && userProjects.length === 0 && userMemories.length === 0 && !hasReview;
  }, [captures, projects, memories, last_daily_review_at, last_weekly_review_at]);
}

/** Returns count of user-created items to gauge engagement level. */
export function useEngagementLevel() {
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();

  return useMemo(() => {
    const userCaptures = captures.filter((c) => !c.id.startsWith("seed-"));
    const userProjects = projects.filter((p) => !p.id.startsWith("proj-"));
    const userMemories = memories.filter((m) => !m.id.startsWith("mem-"));
    const total = userCaptures.length + userProjects.length + userMemories.length;
    return { total, captures: userCaptures.length, projects: userProjects.length, memories: userMemories.length };
  }, [captures, projects, memories]);
}
