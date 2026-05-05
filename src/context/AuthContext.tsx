import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { setCurrentUser, migrateUnscopedData } from "@/lib/persistence";
import { captureGeoMetadata } from "@/lib/geo";
import { linkAttributionToUser, markAttributionActivated } from "@/lib/attribution";
import type { User, Session } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/analytics/ga4";
import { phIdentify, phReset } from "@/lib/analytics/posthog";
import { setSentryUser } from "@/lib/monitoring";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  cloudAvailable: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseEnabled);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      const newUserId = sess?.user?.id ?? null;

      // Handle user switch: if a different user signs in, reload to reset all state
      if (initializedRef.current && newUserId) {
        const changed = setCurrentUser(newUserId);
        if (changed) {
          // Different user — force full reload to clear all in-memory state
          window.location.reload();
          return;
        }
        migrateUnscopedData(newUserId);
      }

      // Handle sign-out: clear user scope and redirect to homepage
      if (initializedRef.current && !newUserId && _event === "SIGNED_OUT") {
        setCurrentUser(null);
        // The signOut callback already triggers window.location.href = "/"
        // but if triggered externally (e.g. token expiry), also redirect
      }

      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      setSentryUser(newUserId);

      // Fire-and-forget: capture country metadata + link visitor attribution
      if (newUserId) {
        const userEmail = sess?.user?.email ?? null;
        setTimeout(() => { captureGeoMetadata().catch(() => {}); }, 0);
        setTimeout(() => { linkAttributionToUser(newUserId, userEmail).catch(() => {}); }, 0);
        setTimeout(() => { markAttributionActivated(newUserId).catch(() => {}); }, 0);
        phIdentify(newUserId, { email: userEmail ?? undefined });

        // Detect first-time Google/OAuth signup: user created within last 30 s
        if (_event === "SIGNED_IN" && sess?.user?.app_metadata?.provider === "google") {
          const createdAt = sess.user.created_at ? new Date(sess.user.created_at).getTime() : 0;
          const isNew = Date.now() - createdAt < 30_000;
          if (isNew) trackEvent("signup_completed", { method: "google" });
        }
      } else if (_event === "SIGNED_OUT") {
        phReset();
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      const userId = sess?.user?.id ?? null;
      if (userId) {
        setCurrentUser(userId);
        migrateUnscopedData(userId);
      }
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      initializedRef.current = true;
      if (userId) {
        const userEmail = sess?.user?.email ?? null;
        setTimeout(() => { captureGeoMetadata().catch(() => {}); }, 0);
        setTimeout(() => { linkAttributionToUser(userId, userEmail).catch(() => {}); }, 0);
        setTimeout(() => { markAttributionActivated(userId).catch(() => {}); }, 0);
        phIdentify(userId, { email: userEmail ?? undefined });
      }
    });

    return () => { subscription.unsubscribe(); };

    // cleanup handled by subscription.unsubscribe above
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (!error) trackEvent("signup_completed", { method: "email" });
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) trackEvent("login", { method: "email" });
    return { error: error as Error | null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (!error) trackEvent("login", { method: "google" });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseEnabled) return;
    setCurrentUser(null);
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, cloudAvailable: isSupabaseEnabled, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
