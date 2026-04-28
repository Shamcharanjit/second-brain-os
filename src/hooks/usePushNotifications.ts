/**
 * usePushNotifications
 *
 * Manages the full Web Push subscription lifecycle:
 *   1. Check browser support + current permission state
 *   2. Subscribe via the service worker's pushManager
 *   3. Save the subscription to Supabase (push_subscriptions table)
 *   4. Allow the user to unsubscribe (removes from DB + browser)
 *
 * VAPID public key is baked in — it's public by design.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Generated with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY =
  "BLJ7Mswr3ZkWm8n1OmQYB_rAfOIy_LnH94M0p5StHH3jzX1SUt7Ij3UOhxLevPEqcek27ZfBIlMv2j9LAF7hUKM";

type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("loading");

  // Detect support + resolve initial state
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    }).catch(() => setState("unsubscribed"));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const endpoint = json.endpoint!;
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!)));
      const auth   = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!)));

      const { error } = await (supabase as any)
        .from("push_subscriptions")
        .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: "user_id,endpoint" });

      if (error) throw error;
      setState("subscribed");
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      const perm = Notification.permission;
      setState(perm === "denied" ? "denied" : "unsubscribed");
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (user) {
          await (supabase as any)
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);
        }
      }
      setState("unsubscribed");
      return true;
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      setState("subscribed");
      return false;
    }
  }, [user]);

  return { state, subscribe, unsubscribe };
}
