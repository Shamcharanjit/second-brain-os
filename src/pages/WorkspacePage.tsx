/**
 * WorkspacePage
 *
 * Main team workspace view with three tabs:
 *   Shared Feed — chronological stream of shared captures
 *   Members     — who's in the workspace + invite code
 *   Settings    — rename, description, leave/delete
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Share2, Settings2, Copy, Check, LogOut, Trash2,
  MessageSquare, Tag, Clock, UserCircle2, AlertCircle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type AIData = {
  title?: string;
  category?: string;
  priority_score?: number;
  urgency?: string;
  tags?: string[];
};

// ── Shared Feed ───────────────────────────────────────────────────────────────

function SharedFeed() {
  const { workspaceCaptures, removeSharedCapture, members, myRole } = useWorkspace();
  const { user } = useAuth();

  if (workspaceCaptures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Share2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Nothing shared yet</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs">
          Open any capture and tap "Share to Workspace" to post it here for your team to see.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workspaceCaptures.map((capture) => {
        const ai = capture.ai_data as AIData | null;
        const title = ai?.title ?? capture.raw_input.slice(0, 80);
        const sharer = members.find((m) => m.user_id === capture.shared_by);
        const sharerName = sharer?.display_name ?? "A teammate";
        const canRemove = capture.shared_by === user?.id || myRole === "owner" || myRole === "admin";

        return (
          <div key={capture.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserCircle2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{sharerName}</span>
                <Clock className="h-3 w-3" />
                <span>{timeAgo(capture.created_at)}</span>
              </div>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100"
                  onClick={() => removeSharedCapture(capture.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <p className="text-sm font-medium leading-snug">{title}</p>

            {capture.note && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{capture.note}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {ai?.category && (
                <Badge variant="secondary" className="text-[10px] h-5">{ai.category}</Badge>
              )}
              {ai?.urgency && ai.urgency !== "low" && (
                <Badge
                  variant={ai.urgency === "high" ? "destructive" : "outline"}
                  className="text-[10px] h-5"
                >
                  {ai.urgency}
                </Badge>
              )}
              {ai?.tags?.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />#{tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab() {
  const { activeWorkspace, members, myRole, leaveWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!activeWorkspace) return null;

  function copyCode() {
    navigator.clipboard.writeText(activeWorkspace!.invite_code);
    setCopied(true);
    toast({ title: "Copied!", description: `Invite code: ${activeWorkspace!.invite_code}` });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Invite code */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Invite your team</p>
        <p className="text-xs text-muted-foreground">
          Share this code. Anyone who enters it in InsightHalo will join this workspace.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-muted px-4 py-2.5 font-mono text-lg font-bold tracking-[0.3em] text-center">
            {activeWorkspace.invite_code}
          </code>
          <Button variant="outline" size="icon" onClick={copyCode} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {(m.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {m.display_name ?? "Unknown"}
                {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
              </p>
            </div>
            <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-[10px] h-5 capitalize">
              {m.role}
            </Badge>
          </div>
        ))}
      </div>

      {/* Leave workspace */}
      {myRole !== "owner" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
              <LogOut className="h-4 w-4" /> Leave workspace
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave {activeWorkspace.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll lose access to the shared feed. You can rejoin later using the invite code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => leaveWorkspace(activeWorkspace.id)}
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const { activeWorkspace, leaveWorkspace, setActiveWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [desc, setDesc] = useState(activeWorkspace?.description ?? "");
  const [saving, setSaving] = useState(false);

  if (!activeWorkspace) return null;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ name: name.trim(), description: desc.trim() || null })
      .eq("id", activeWorkspace!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!" });
    }
  }

  async function deleteWorkspace() {
    await supabase.from("workspaces").delete().eq("id", activeWorkspace!.id);
    setActiveWorkspace(null);
    navigate("/app");
    toast({ title: "Workspace deleted" });
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ws-name-edit" className="text-xs">Workspace name</Label>
          <Input id="ws-name-edit" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-desc-edit" className="text-xs">Description</Label>
          <Textarea
            id="ws-desc-edit"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="What's this workspace for?"
          />
        </div>
        <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Danger zone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deleting a workspace removes all shared captures and removes all members. This cannot be undone.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full gap-2">
              <Trash2 className="h-4 w-4" /> Delete workspace
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{activeWorkspace.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the workspace and all shared captures. Members will lose access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={deleteWorkspace}>
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { activeWorkspace, workspaceCaptures, members, loading } = useWorkspace();
  const navigate = useNavigate();

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Users className="h-14 w-14 text-muted-foreground/30" />
        <div>
          <p className="text-lg font-semibold">No workspace selected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create or join a workspace to collaborate with your team.
          </p>
        </div>
        <Button onClick={() => navigate("/app")} variant="outline">← Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{activeWorkspace.name}</h1>
        </div>
        {activeWorkspace.description && (
          <p className="text-sm text-muted-foreground mt-1">{activeWorkspace.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {workspaceCaptures.length} shared {workspaceCaptures.length === 1 ? "capture" : "captures"}
          </span>
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed" className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Shared Feed
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <SharedFeed />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
