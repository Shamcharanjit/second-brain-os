/**
 * WorkspaceSwitcher
 *
 * Sidebar dropdown that lets users switch between personal mode and any
 * team workspace they belong to. Also surfaces create/join actions.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Users, Plus, LogIn, Check } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, joinWorkspace } =
    useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!wsName.trim()) return;
    setBusy(true);
    const ws = await createWorkspace(wsName, wsDesc);
    setBusy(false);
    if (ws) {
      setCreateOpen(false);
      setWsName("");
      setWsDesc("");
      navigate("/workspace");
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setBusy(true);
    const ok = await joinWorkspace(inviteCode);
    setBusy(false);
    if (ok) {
      setJoinOpen(false);
      setInviteCode("");
      navigate("/workspace");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="flex-1 text-left font-medium truncate">
              {activeWorkspace ? activeWorkspace.name : "Personal"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>

          {/* Personal mode */}
          <DropdownMenuItem
            onClick={() => setActiveWorkspace(null)}
            className="gap-2 text-xs"
          >
            <span className="flex-1">Personal</span>
            {!activeWorkspace && <Check className="h-3 w-3 text-primary" />}
          </DropdownMenuItem>

          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => { setActiveWorkspace(ws); navigate("/workspace"); }}
              className="gap-2 text-xs"
            >
              <span className="flex-1 truncate">{ws.name}</span>
              {activeWorkspace?.id === ws.id && <Check className="h-3 w-3 text-primary" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> New workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setJoinOpen(true)} className="gap-2 text-xs">
            <LogIn className="h-3.5 w-3.5" /> Join with code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create workspace dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Invite your team and share captures together.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-xs">Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g. My Startup"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-desc" className="text-xs">Description (optional)</Label>
              <Input
                id="ws-desc"
                placeholder="What is this workspace for?"
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!wsName.trim() || busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join workspace dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Join workspace</DialogTitle>
            <DialogDescription>
              Enter the 8-character invite code from your team lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="invite-code" className="text-xs">Invite code</Label>
            <Input
              id="invite-code"
              placeholder="e.g. AB12CD34"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="font-mono tracking-widest"
              maxLength={8}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleJoin} disabled={inviteCode.length < 6 || busy}>
              {busy ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
