import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings, Shield, Cloud, HardDrive, Download, Upload,
  Trash2, RefreshCw, ArrowLeft, CheckCircle2, AlertTriangle, Heart,
  Sparkles, Crown,
} from "lucide-react";
import { downloadBackup, readFileAsJSON, validateBackup, restoreBackup, clearLocalData } from "@/lib/data-export";
import type { InsightHaloBackup } from "@/lib/data-export";

export default function SettingsPage() {
  const { user, cloudAvailable, signOut } = useAuth();
  const { plan, isPro, aiTriageRemaining, aiTriageUsedToday, limits } = useSubscription();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<InsightHaloBackup | null>(null);

  const handleExport = () => {
    downloadBackup();
    toast.success("Backup downloaded");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readFileAsJSON(file);
      if (!validateBackup(parsed)) {
        toast.error("Invalid backup file — not a recognized InsightHalo export.");
        return;
      }
      setPendingBackup(parsed as InsightHaloBackup);
      setShowRestoreConfirm(true);
    } catch {
      toast.error("Could not read file. Make sure it's a valid JSON backup.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRestore = () => {
    if (!pendingBackup) return;
    const ok = restoreBackup(pendingBackup);
    if (ok) {
      toast.success("Backup restored. Reloading…");
      setTimeout(() => window.location.reload(), 800);
    } else {
      toast.error("Restore failed.");
    }
    setShowRestoreConfirm(false);
    setPendingBackup(null);
  };

  const handleClear = () => {
    clearLocalData();
    toast.success("Local data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleRefreshFromCloud = () => {
    clearLocalData();
    toast.success("Local cache cleared. Rehydrating from cloud…");
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Settings & Data
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Control your data, backups, and privacy.</p>
      </div>

      {/* Account & Sync Status */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {user ? <Cloud className="h-4 w-4 text-primary" /> : <HardDrive className="h-4 w-4" />}
          Account & Sync
        </h2>
        <div className="space-y-2">
          {!cloudAvailable ? (
            <div className="flex items-start gap-3">
              <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Local-only mode</p>
                <p className="text-xs text-muted-foreground">Cloud sync is not configured. Your data is stored only on this device.</p>
              </div>
            </div>
          ) : user ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Cloud sync is active</p>
                <p className="text-xs text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{user.email}</span>. Your data is securely backed up and synced.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Local-only mode</p>
                <p className="text-xs text-muted-foreground">Your data is stored on this device. Sign in to enable cloud backup and multi-device sync.</p>
                <Button size="sm" variant="outline" className="text-xs mt-1" onClick={() => navigate("/auth")}>Sign in to sync</Button>
              </div>
            </div>
          )}
        </div>
        {cloudAvailable && user && (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleRefreshFromCloud}>
              <RefreshCw className="h-3 w-3" /> Refresh from cloud
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1.5 text-muted-foreground" onClick={() => signOut()}>Sign out</Button>
          </div>
        )}
      </section>

      {/* Export & Backup */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Download className="h-4 w-4" /> Export & Backup
        </h2>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Download a complete backup of your captures, projects, memory entries, and review data as a JSON file. You can restore from this backup at any time.
          </p>
          <Button size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export all data
          </Button>
        </div>
      </section>

      {/* Import / Restore */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import / Restore
        </h2>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Restore from a previously exported InsightHalo backup. This will replace your current local data with the backup contents.
          </p>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Choose backup file
          </Button>
        </div>

        {/* Restore confirm */}
        {showRestoreConfirm && pendingBackup && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Restore from backup?</p>
                <p className="text-xs text-muted-foreground">
                  This will replace all local data with the backup from {new Date(pendingBackup._exportedAt).toLocaleDateString()}.
                  {cloudAvailable && user && " Your cloud data will be updated on next sync."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={handleRestore}>
                Replace & restore
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowRestoreConfirm(false); setPendingBackup(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Clear Local Data */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Clear Local Data
        </h2>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Remove all InsightHalo data stored on this device.
            {cloudAvailable && user
              ? " Since you're signed in, your data will rehydrate from the cloud on next load."
              : " This action cannot be undone. Export a backup first if you want to keep your data."
            }
          </p>
          {!showClearConfirm ? (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setShowClearConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear local data
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm font-medium">
                  {cloudAvailable && user
                    ? "Clear local cache? Data will reload from cloud."
                    : "Clear all local data? This cannot be undone."
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" className="text-xs" onClick={handleClear}>Yes, clear</Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Data Ownership */}
      <section className="rounded-xl border border-dashed bg-muted/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Your data belongs to you</h2>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            InsightHalo is built on a local-first architecture. Your captures, ideas, projects, and memories are stored on your device first — always accessible, always private.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cloud sync is optional and exists to protect your data and enable multi-device access. You can export your entire second brain at any time as a standard JSON file — no lock-in, no proprietary formats.
          </p>
        </div>
      </section>
    </div>
  );
}
