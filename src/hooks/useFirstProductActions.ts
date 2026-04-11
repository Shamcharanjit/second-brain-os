/**
 * Hook that tracks first_capture_created, first_project_created, first_memory_created
 * by watching the respective context lengths.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { logFunnelEvent } from "@/lib/activation-funnel";

export function useFirstProductActions(
  captureCount: number,
  projectCount: number,
  memoryCount: number
) {
  const { user, cloudAvailable } = useAuth();
  const prevCaptures = useRef(0);
  const prevProjects = useRef(0);
  const prevMemories = useRef(0);

  useEffect(() => {
    if (!user || !cloudAvailable) return;
    const userId = user.id;

    if (captureCount > 0 && prevCaptures.current === 0) {
      logFunnelEvent("first_capture_created", { userId, source: "brain_context" });
    }
    prevCaptures.current = captureCount;
  }, [captureCount, user, cloudAvailable]);

  useEffect(() => {
    if (!user || !cloudAvailable) return;
    const userId = user.id;

    if (projectCount > 0 && prevProjects.current === 0) {
      logFunnelEvent("first_project_created", { userId, source: "project_context" });
    }
    prevProjects.current = projectCount;
  }, [projectCount, user, cloudAvailable]);

  useEffect(() => {
    if (!user || !cloudAvailable) return;
    const userId = user.id;

    if (memoryCount > 0 && prevMemories.current === 0) {
      logFunnelEvent("first_memory_created", { userId, source: "memory_context" });
    }
    prevMemories.current = memoryCount;
  }, [memoryCount, user, cloudAvailable]);
}
