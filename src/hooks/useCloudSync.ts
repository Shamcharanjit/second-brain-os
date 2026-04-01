import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { saveState } from "@/lib/persistence";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/**
 * Debounced cloud persistence hook with full-replace sync.
 * Uses the sync function (upsert + delete orphans) for correctness.
 */
export function useCloudSync<T>(
  data: T,
  syncFn: (userId: string, data: T) => Promise<void>,
  delayMs = 2000,
) {
  const { user } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const latestDataRef = useRef(data);
  const initializedRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  latestDataRef.current = data;

  useEffect(() => {
    // Skip the very first render (initial hydration)
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (!user) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSyncStatus("syncing");
    timeoutRef.current = setTimeout(async () => {
      try {
        await syncFn(user.id, latestDataRef.current);
        setSyncStatus("synced");
      } catch (e) {
        console.error("Cloud sync error:", e);
        setSyncStatus("error");
      }
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, user, syncFn, delayMs]);

  return syncStatus;
}

/**
 * On first auth-aware load: hydrates from cloud if available,
 * or seeds cloud from local data if cloud is empty.
 * After hydration, overwrites localStorage to prevent stale resurrection.
 */
export function useCloudHydration<T>(
  localData: T,
  setData: (data: T) => void,
  storageKey: string,
  fetchFn: (userId: string) => Promise<T>,
  seedFn: (userId: string, data: T) => Promise<void>,
  isEmpty: (data: T) => boolean,
) {
  const { user } = useAuth();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!user || hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      try {
        const cloudData = await fetchFn(user.id);
        if (!isEmpty(cloudData)) {
          // Cloud has data — use it and overwrite local to stay in sync
          setData(cloudData);
          saveState(storageKey, cloudData);
        } else if (!isEmpty(localData)) {
          // Cloud empty, local has data — seed cloud
          await seedFn(user.id, localData);
        }
      } catch (e) {
        console.error("Cloud hydration failed, using local data:", e);
      }
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
}
