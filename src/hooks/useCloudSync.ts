import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Debounced cloud persistence hook.
 * Saves data to cloud after a delay when the user is authenticated.
 * Falls back to local-only when not authenticated.
 */
export function useCloudSync<T>(
  data: T,
  saveFn: (userId: string, data: T) => Promise<void>,
  delayMs = 2000,
) {
  const { user } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const latestDataRef = useRef(data);
  const initializedRef = useRef(false);

  latestDataRef.current = data;

  useEffect(() => {
    // Skip the very first render (initial hydration)
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (!user) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveFn(user.id, latestDataRef.current);
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, user, saveFn, delayMs]);
}

/**
 * On first auth-aware load: hydrates from cloud if available,
 * or seeds cloud from local data if cloud is empty.
 */
export function useCloudHydration<T>(
  localData: T,
  setData: (data: T) => void,
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
          // Cloud has data — use it
          setData(cloudData);
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
