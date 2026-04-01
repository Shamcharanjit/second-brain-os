import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  cloudAvailable: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseEnabled);

  useEffect(() => {
    if (!isSupabaseEnabled) return;

    // Lazy-import to avoid crash when env vars are missing
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Store unsubscribe for cleanup
      (window as any).__insighthalo_auth_unsub = () => subscription.unsubscribe();
    });

    return () => {
      (window as any).__insighthalo_auth_unsub?.();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseEnabled) return { error: new Error("Cloud not configured") };
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseEnabled) return;
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, cloudAvailable: isSupabaseEnabled, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
