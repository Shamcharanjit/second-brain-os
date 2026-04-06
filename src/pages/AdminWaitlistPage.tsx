import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, ArrowLeft, Download, RefreshCw, CheckCircle2, Clock,
  Search, Filter, Loader2, X, Users, UserCheck, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  use_case: string | null;
  notes: string | null;
  status: string;
  invited: boolean;
  created_at: string;
};

const STATUS_OPTIONS = ["pending", "invited", "reviewed"] as const;

export default function AdminWaitlistPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterInvited, setFilterInvited] = useState<"all" | "invited" | "not_invited">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist_signups" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load waitlist");
      console.error(error);
    } else {
      setEntries((data as any as WaitlistEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (cloudAvailable && user) fetchEntries(); }, [cloudAvailable, user]);

  // Gate: must be authenticated
  if (!cloudAvailable || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to access this page.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

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
    if (filterStatus !== "all") result = result.filter((e) => e.status === filterStatus);
    return result;
  }, [entries, search, filterInvited, filterStatus]);

  const toggleInvited = async (entry: WaitlistEntry) => {
    const newVal = !entry.invited;
    const { error } = await supabase
      .from("waitlist_signups" as any)
      .update({ invited: newVal, status: newVal ? "invited" : "pending" } as any)
      .eq("id", entry.id);

    if (error) { toast.error("Update failed"); return; }
    setEntries((prev) =>
      prev.map((e) => e.id === entry.id ? { ...e, invited: newVal, status: newVal ? "invited" : "pending" } : e)
    );
    toast.success(newVal ? "Marked as invited" : "Invite removed");
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
    const headers = ["name", "email", "use_case", "notes", "status", "invited", "created_at"];
    const escape = (v: string | null | boolean) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = filtered.map((e) =>
      headers.map((h) => escape((e as any)[h])).join(",")
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Signups", value: entries.length, icon: Users, color: "text-foreground" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-muted-foreground" },
            { label: "Invited", value: invitedCount, icon: UserCheck, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
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
            {(["all", "not_invited", "invited"] as const).map((v) => (
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
                {v === "all" ? "All" : v === "invited" ? "Invited" : "Pending"}
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
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {entries.length === 0 ? "No waitlist signups yet." : "No entries match your filters."}
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
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
                    <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
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
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
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
