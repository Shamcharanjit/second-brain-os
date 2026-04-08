import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { isFounderAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, ArrowLeft, Download, RefreshCw, CheckCircle2, Clock,
  Search, Filter, Loader2, X, Users, UserCheck, Copy, Send,
  ArrowUpDown, AlertTriangle, BarChart3, Zap, Star, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  use_case: string | null;
  notes: string | null;
  status: string;
  invited: boolean;
  invite_token: string | null;
  invite_sent_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
  referral_count: number;
  referral_reward_level: number;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
};

const REWARD_LABELS: Record<number, string> = {
  0: "—",
  1: "Priority boost",
  3: "Fast-track",
  5: "Feature access",
  10: "Insider",
};

const STATUS_OPTIONS = ["pending", "invited", "reviewed", "activated"] as const;

type SortKey = "newest" | "oldest" | "pending_first" | "invited_first" | "reviewed_first" | "most_referrals";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "pending_first", label: "Pending first" },
  { value: "invited_first", label: "Invited first" },
  { value: "reviewed_first", label: "Reviewed first" },
  { value: "most_referrals", label: "Most referrals" },
];

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getInviteLink(token: string): string {
  return `${window.location.origin}/invite?token=${token}`;
}

/** Pending + not invited + created > 3 days ago */
function needsReview(e: WaitlistEntry): boolean {
  return e.status === "pending" && !e.invited && differenceInDays(new Date(), new Date(e.created_at)) > 3;
}

/** Invited but invite_sent_at > 3 days ago (or no send timestamp) and still not reviewed */
function isStaleInvite(e: WaitlistEntry): boolean {
  if (!e.invited) return false;
  const ref = e.invite_sent_at ? new Date(e.invite_sent_at) : new Date(e.created_at);
  return differenceInDays(new Date(), ref) > 3 && e.status !== "reviewed";
}

function sortEntries(entries: WaitlistEntry[], key: SortKey): WaitlistEntry[] {
  const sorted = [...entries];
  switch (key) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "pending_first":
      return sorted.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
    case "invited_first":
      return sorted.sort((a, b) => (b.invited ? 1 : 0) - (a.invited ? 1 : 0));
    case "reviewed_first":
      return sorted.sort((a, b) => (a.status === "reviewed" ? -1 : 1) - (b.status === "reviewed" ? -1 : 1));
    case "most_referrals":
      return sorted.sort((a, b) => b.referral_count - a.referral_count);
    default:
      return sorted;
  }
}

export default function AdminWaitlistPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterInvited, setFilterInvited] = useState<"all" | "invited" | "not_invited" | "ready_to_invite" | "top_referrers" | "fast_track">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");

  const fetchEntries = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("waitlist_signups" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Waitlist query error:", error);
        // Only show error if we have no cached data at all
        if (entries.length === 0) {
          setLoadError("Could not load waitlist data. Please try refreshing.");
        } else {
          // We have stale data — show a non-blocking toast
          toast.error("Refresh failed — showing cached data");
        }
      } else {
        setEntries((data as any as WaitlistEntry[]) || []);
        setLoadError(null);
      }
    } catch (err) {
      console.error("Waitlist fetch exception:", err);
      if (entries.length === 0) {
        setLoadError("Could not load waitlist data. Please try refreshing.");
      }
    }
    setLoading(false);
  };

  useEffect(() => { if (cloudAvailable && user) fetchEntries(); }, [cloudAvailable, user]);

  const filtered = useMemo(() => {
    let result = entries;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
    }
    if (filterInvited === "invited") result = result.filter((e) => e.invited);
    if (filterInvited === "not_invited") result = result.filter((e) => !e.invited);
    if (filterInvited === "ready_to_invite") {
      result = result.filter((e) => e.status === "pending" && !e.invited);
      result.sort((a, b) => b.referral_reward_level - a.referral_reward_level);
    }
    if (filterInvited === "top_referrers") result = result.filter((e) => e.referral_count > 0);
    if (filterInvited === "fast_track") result = result.filter((e) => e.referral_reward_level >= 3);
    if (filterStatus !== "all") result = result.filter((e) => e.status === filterStatus);
    return sortEntries(result, sortKey);
  }, [entries, search, filterInvited, filterStatus, sortKey]);

  // Suggested next invites: top 10 uninvited users ranked by priority
  const suggestedInvites = useMemo(() => {
    return entries
      .filter((e) => e.status === "pending" && !e.invited)
      .sort((a, b) => {
        if (b.referral_reward_level !== a.referral_reward_level) return b.referral_reward_level - a.referral_reward_level;
        if (b.referral_count !== a.referral_count) return b.referral_count - a.referral_count;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
      .slice(0, 10);
  }, [entries]);

  if (!cloudAvailable || !user || !isFounderAdmin(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to access this page.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const toggleInvited = async (entry: WaitlistEntry) => {
    const newVal = !entry.invited;
    const token = newVal && !entry.invite_token ? generateToken() : entry.invite_token;
    const updatePayload: any = {
      invited: newVal,
      status: newVal ? "invited" : "pending",
      ...(newVal && !entry.invite_token ? { invite_token: token } : {}),
    };

    const { error } = await supabase
      .from("waitlist_signups" as any)
      .update(updatePayload)
      .eq("id", entry.id);

    if (error) { toast.error("Update failed"); return; }
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, invited: newVal, status: newVal ? "invited" : "pending", invite_token: newVal ? (token ?? e.invite_token) : e.invite_token }
          : e
      )
    );
    toast.success(newVal ? "Marked as invited — token generated" : "Invite removed");
  };

  const copyInviteLink = (entry: WaitlistEntry) => {
    if (!entry.invite_token) return;
    navigator.clipboard.writeText(getInviteLink(entry.invite_token));
    toast.success("Invite link copied!");
  };

  const markInviteSent = async (entry: WaitlistEntry) => {
    const { error } = await supabase
      .from("waitlist_signups" as any)
      .update({ invite_sent_at: new Date().toISOString() } as any)
      .eq("id", entry.id);

    if (error) { toast.error("Update failed"); return; }
    setEntries((prev) =>
      prev.map((e) => e.id === entry.id ? { ...e, invite_sent_at: new Date().toISOString() } : e)
    );
    toast.success("Marked as sent");
  };

  const updateStatus = async (entry: WaitlistEntry, status: string) => {
    const { error } = await supabase
      .from("waitlist_signups" as any)
      .update({ status } as any)
      .eq("id", entry.id);

    if (error) { toast.error("Update failed"); return; }
    setEntries((prev) =>
      prev.map((e) => e.id === entry.id ? { ...e, status } : e)
    );
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase
      .from("waitlist_signups" as any)
      .update({ notes: editNotesValue.trim() || null } as any)
      .eq("id", id);

    if (error) { toast.error("Update failed"); return; }
    setEntries((prev) =>
      prev.map((e) => e.id === id ? { ...e, notes: editNotesValue.trim() || null } : e)
    );
    setEditingNotes(null);
    toast.success("Notes saved");
  };

  const exportCSV = () => {
    const headers = ["name", "email", "use_case", "notes", "status", "invited", "invite_token", "invite_link", "invite_sent_at", "created_at"];
    const escape = (v: string | null | boolean) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = filtered.map((e) =>
      headers.map((h) => {
        if (h === "invite_link") return escape(e.invite_token ? getInviteLink(e.invite_token) : null);
        return escape((e as any)[h]);
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insighthalo-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };

  const invitedCount = entries.filter((e) => e.invited).length;
  const pendingCount = entries.filter((e) => !e.invited).length;
  const readyToInviteCount = entries.filter((e) => e.status === "pending" && !e.invited).length;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Waitlist Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/analytics")} className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={fetchEntries} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Signups", value: entries.length, icon: Users, color: "text-foreground" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-muted-foreground" },
            { label: "Invited", value: invitedCount, icon: UserCheck, color: "text-primary" },
            { label: "Ready to Invite", value: readyToInviteCount, icon: Send, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Suggested Next Invites */}
        {suggestedInvites.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Suggested Next Invites</h2>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{suggestedInvites.length}</span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Name</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Email</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Referrals</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Reward</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Age</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Use Case</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestedInvites.map((entry) => {
                      const ageDays = differenceInDays(new Date(), new Date(entry.created_at));
                      const isHighPriority = entry.referral_reward_level >= 3;
                      return (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {entry.name}
                              {isHighPriority && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                  <Star className="h-2.5 w-2.5" /> High Priority
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{entry.email}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn("text-xs font-medium", entry.referral_count > 0 ? "text-primary" : "text-muted-foreground/40")}>
                              {entry.referral_count}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {entry.referral_reward_level > 0 ? (
                              <span className={cn(
                                "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium",
                                entry.referral_reward_level >= 10 ? "bg-primary/15 text-primary border-primary/30" :
                                entry.referral_reward_level >= 5 ? "bg-primary/10 text-primary/80 border-primary/20" :
                                "bg-muted text-muted-foreground border-border"
                              )}>
                                {REWARD_LABELS[entry.referral_reward_level] || `Lvl ${entry.referral_reward_level}`}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{ageDays}d</td>
                          <td className="px-4 py-2.5">
                            {entry.use_case ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">{entry.use_case}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={async () => {
                                if (!entry.invite_token) {
                                  await toggleInvited(entry);
                                  const updated = entries.find((e) => e.id === entry.id);
                                  if (updated?.invite_token) {
                                    navigator.clipboard.writeText(getInviteLink(updated.invite_token));
                                    toast.success("Invite link copied");
                                  }
                                } else {
                                  navigator.clipboard.writeText(getInviteLink(entry.invite_token));
                                  toast.success("Invite link copied");
                                }
                              }}
                            >
                              <Send className="h-3 w-3" /> Invite Now
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Filters + Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(["all", "not_invited", "invited", "ready_to_invite", "top_referrers", "fast_track"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterInvited(v)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  filterInvited === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                {v === "all" ? "All" : v === "invited" ? "Invited" : v === "not_invited" ? "Pending" : v === "ready_to_invite" ? "Ready to Invite" : v === "top_referrers" ? "Top Referrers" : "Fast-track"}
              </button>
            ))}
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs h-8 rounded-md border border-border bg-card px-2 text-muted-foreground"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Sort control */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-xs h-8 rounded-md border border-border bg-card px-2 text-muted-foreground"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : loadError && entries.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={fetchEntries} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {entries.length === 0 ? "No waitlist signups yet." : "No entries match your filters."}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Name</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Email</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Use Case</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Notes</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Invited</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Invite Link</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Invite Sent</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Referrals</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Reward</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Signed Up</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const _needsReview = needsReview(entry);
                    const _staleInvite = isStaleInvite(entry);

                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          _needsReview ? "bg-destructive/5 hover:bg-destructive/10" :
                          _staleInvite ? "bg-yellow-500/5 hover:bg-yellow-500/10" :
                          "hover:bg-muted/20"
                        )}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{entry.name}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.email}</td>
                        <td className="px-4 py-3">
                          {entry.use_case ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">{entry.use_case}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {editingNotes === entry.id ? (
                            <div className="flex gap-1.5">
                              <Textarea
                                value={editNotesValue}
                                onChange={(e) => setEditNotesValue(e.target.value)}
                                rows={2}
                                className="text-xs resize-none min-w-[140px]"
                                autoFocus
                              />
                              <div className="flex flex-col gap-1">
                                <Button size="sm" onClick={() => saveNotes(entry.id)} className="h-6 px-2 text-[10px]">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)} className="h-6 px-2 text-[10px]">✕</Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNotes(entry.id); setEditNotesValue(entry.notes || ""); }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left truncate max-w-[180px] block"
                              title="Click to edit notes"
                            >
                              {entry.notes || <span className="text-muted-foreground/40 italic">add note…</span>}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={entry.status}
                            onChange={(e) => updateStatus(entry, e.target.value)}
                            className={cn(
                              "text-xs h-7 rounded-md border px-2 bg-card",
                              entry.status === "invited" && "text-primary border-primary/30",
                              entry.status === "pending" && "text-muted-foreground border-border",
                              entry.status === "reviewed" && "text-foreground border-border",
                            )}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleInvited(entry)}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                              entry.invited
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-card text-muted-foreground border-border hover:border-primary/30"
                            )}
                          >
                            {entry.invited ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {entry.invited ? "Yes" : "No"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {entry.invited && entry.invite_token ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyInviteLink(entry)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-card hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                                title={getInviteLink(entry.invite_token)}
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                              {/* Resend Invite = copy link again with distinct toast */}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(getInviteLink(entry.invite_token!));
                                  toast.success("Invite link copied");
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-card hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                                title="Resend invite (copies link)"
                              >
                                <RefreshCw className="h-3 w-3" /> Resend
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {/* Invite Sent column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.invited && entry.invite_token ? (
                            !entry.invite_sent_at ? (
                              <button
                                onClick={() => markInviteSent(entry)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-card hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                                title="Mark invite as sent"
                              >
                                <Send className="h-3 w-3" /> Mark sent
                              </button>
                            ) : (
                              <span className="text-[10px] text-primary/70">
                                {new Date(entry.invite_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {/* Referrals column */}
                        <td className="px-4 py-3 text-center">
                          {entry.referral_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                              {entry.referral_count}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">0</span>
                          )}
                        </td>
                        {/* Reward Level column */}
                        <td className="px-4 py-3">
                          {entry.referral_reward_level > 0 ? (
                            <span className={cn(
                              "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              entry.referral_reward_level >= 10 ? "bg-primary/15 text-primary border-primary/30" :
                              entry.referral_reward_level >= 5 ? "bg-primary/10 text-primary/80 border-primary/20" :
                              "bg-muted text-muted-foreground border-border"
                            )}>
                              {REWARD_LABELS[entry.referral_reward_level] || `Lvl ${entry.referral_reward_level}`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        {/* Flags column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {_needsReview && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                <AlertTriangle className="h-2.5 w-2.5" /> Needs review
                              </span>
                            )}
                            {_staleInvite && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                <Clock className="h-2.5 w-2.5" /> Invite not accepted
                              </span>
                            )}
                            {entry.last_reminder_sent_at && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" title={`Sent ${entry.reminder_count} reminder(s), last: ${new Date(entry.last_reminder_sent_at).toLocaleDateString()}`}>
                                <Mail className="h-2.5 w-2.5" /> Reminder Sent
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground/50 text-center">
          Showing {filtered.length} of {entries.length} entries
        </p>
      </div>
    </div>
  );
}
