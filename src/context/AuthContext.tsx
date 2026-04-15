import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { setCurrentUser, migrateUnscopedData } from "@/lib/persistence";
import type { User, Session } from "@supabase/supabase-js";

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
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return { error: result.error instanceof Error ? result.error : new Error(String(result.error)) };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
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
