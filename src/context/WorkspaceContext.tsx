/**
 * WorkspaceContext
 *
 * Manages the active team workspace for the current user.
 * Falls back gracefully when no workspace is active (personal mode).
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  display_name: string | null;
  joined_at: string;
}

export interface WorkspaceCapture {
  id: string;
  workspace_id: string;
  capture_id: string | null;
  shared_by: string;
  raw_input: string;
  ai_data: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
  // Joined from workspace_members
  sharer_name?: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  workspaceCaptures: WorkspaceCapture[];
  myRole: WorkspaceRole | null;
  loading: boolean;
  setActiveWorkspace: (ws: Workspace | null) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>;
  joinWorkspace: (inviteCode: string) => Promise<boolean>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  shareCapture: (captureId: string, rawInput: string, aiData: unknown, note?: string) => Promise<boolean>;
  removeSharedCapture: (sharedCaptureId: string) => Promise<void>;
  refreshWorkspaceCaptures: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const ACTIVE_WS_KEY = "insighthalo_active_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceCaptures, setWorkspaceCaptures] = useState<WorkspaceCapture[]>([]);
  const [loading, setLoading] = useState(false);

  const myRole: WorkspaceRole | null = activeWorkspace
    ? (members.find((m) => m.user_id === user?.id)?.role ?? null)
    : null;

  // ── Load user's workspaces ─────────────────────────────────────────────────

  const loadWorkspaces = useCallback(async () => {
    if (!user) { setWorkspaces([]); return; }
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkspaces((data as Workspace[]) ?? []);

    // Restore last active workspace
    const savedId = localStorage.getItem(ACTIVE_WS_KEY);
    if (savedId && data) {
      const found = (data as Workspace[]).find((w) => w.id === savedId);
      if (found) setActiveWorkspaceState(found);
    }
  }, [user]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  // ── Load members + captures when active workspace changes ──────────────────

  const loadMembers = useCallback(async (wsId: string) => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", wsId)
      .order("joined_at", { ascending: true });
    setMembers((data as WorkspaceMember[]) ?? []);
  }, []);

  const loadCaptures = useCallback(async (wsId: string) => {
    const { data } = await supabase
      .from("workspace_captures")
      .select("*")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(100);
    setWorkspaceCaptures((data as WorkspaceCapture[]) ?? []);
  }, []);

  useEffect(() => {
    if (!activeWorkspace) {
      setMembers([]);
      setWorkspaceCaptures([]);
      return;
    }
    setLoading(true);
    Promise.all([loadMembers(activeWorkspace.id), loadCaptures(activeWorkspace.id)]).finally(() =>
      setLoading(false),
    );
  }, [activeWorkspace, loadMembers, loadCaptures]);

  // ── Real-time subscription for workspace captures ──────────────────────────

  useEffect(() => {
    if (!activeWorkspace) return;
    const channel = supabase
      .channel(`ws-captures-${activeWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_captures", filter: `workspace_id=eq.${activeWorkspace.id}` },
        () => { loadCaptures(activeWorkspace.id); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace, loadCaptures]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setActiveWorkspace(ws: Workspace | null) {
    setActiveWorkspaceState(ws);
    if (ws) localStorage.setItem(ACTIVE_WS_KEY, ws.id);
    else localStorage.removeItem(ACTIVE_WS_KEY);
  }

  async function createWorkspace(name: string, description?: string): Promise<Workspace | null> {
    if (!user) return null;
    const { data: ws, error } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), description: description?.trim() || null, owner_id: user.id })
      .select()
      .single();
    if (error || !ws) {
      toast({ title: "Couldn't create workspace", description: error?.message, variant: "destructive" });
      return null;
    }
    // Auto-join as owner
    await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner",
      display_name: user.email?.split("@")[0] ?? null,
    });
    setWorkspaces((prev) => [ws as Workspace, ...prev]);
    setActiveWorkspace(ws as Workspace);
    toast({ title: "Workspace created!", description: `Share the invite code: ${(ws as Workspace).invite_code}` });
    return ws as Workspace;
  }

  async function joinWorkspace(inviteCode: string): Promise<boolean> {
    if (!user) return false;
    const { data: ws, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase().trim())
      .single();
    if (error || !ws) {
      toast({ title: "Invalid invite code", description: "Double-check and try again.", variant: "destructive" });
      return false;
    }
    // Check not already a member
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", ws.id)
      .eq("user_id", user.id)
      .single();
    if (existing) {
      setActiveWorkspace(ws as Workspace);
      toast({ title: "Already a member", description: `Switched to ${ws.name}` });
      return true;
    }
    const { error: joinError } = await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "member",
      display_name: user.email?.split("@")[0] ?? null,
    });
    if (joinError) {
      toast({ title: "Couldn't join workspace", description: joinError.message, variant: "destructive" });
      return false;
    }
    setWorkspaces((prev) => {
      if (prev.find((w) => w.id === ws.id)) return prev;
      return [ws as Workspace, ...prev];
    });
    setActiveWorkspace(ws as Workspace);
    toast({ title: `Joined ${ws.name}!`, description: "You're now part of this workspace." });
    return true;
  }

  async function leaveWorkspace(workspaceId: string) {
    if (!user) return;
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (activeWorkspace?.id === workspaceId) setActiveWorkspace(null);
    toast({ title: "Left workspace" });
  }

  async function shareCapture(
    captureId: string,
    rawInput: string,
    aiData: unknown,
    note?: string,
  ): Promise<boolean> {
    if (!user || !activeWorkspace) return false;
    const { error } = await supabase.from("workspace_captures").insert({
      workspace_id: activeWorkspace.id,
      capture_id: captureId,
      shared_by: user.id,
      raw_input: rawInput,
      ai_data: aiData as Record<string, unknown>,
      note: note?.trim() || null,
    });
    if (error) {
      toast({ title: "Couldn't share capture", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Shared to workspace!" });
    return true;
  }

  async function removeSharedCapture(sharedCaptureId: string) {
    await supabase.from("workspace_captures").delete().eq("id", sharedCaptureId);
    setWorkspaceCaptures((prev) => prev.filter((c) => c.id !== sharedCaptureId));
  }

  async function refreshWorkspaceCaptures() {
    if (activeWorkspace) await loadCaptures(activeWorkspace.id);
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        members,
        workspaceCaptures,
        myRole,
        loading,
        setActiveWorkspace,
        createWorkspace,
        joinWorkspace,
        leaveWorkspace,
        shareCapture,
        removeSharedCapture,
        refreshWorkspaceCaptures,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
