import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, ArrowLeft, Plus, Loader2, Megaphone, CheckCircle2, XCircle,
  Edit2, Trash2, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Announcement = {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_link: string | null;
  status: string;
  created_at: string;
};

export default function AdminAnnouncementsPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", message: "", cta_label: "", cta_link: "" });

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load announcements"); console.error(error); }
    else setAnnouncements((data as any as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (cloudAvailable && user) fetchAnnouncements(); }, [cloudAvailable, user]);

  const resetForm = () => {
    setForm({ title: "", message: "", cta_label: "", cta_link: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    const payload: any = {
      title: form.title.trim(),
      message: form.message.trim(),
      cta_label: form.cta_label.trim() || null,
      cta_link: form.cta_link.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("announcements" as any).update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Announcement updated");
    } else {
      const { error } = await supabase.from("announcements" as any).insert(payload);
      if (error) { toast.error("Create failed"); return; }
      toast.success("Announcement created");
    }

    resetForm();
    fetchAnnouncements();
  };

  const toggleStatus = async (a: Announcement) => {
    const newStatus = a.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("announcements" as any).update({ status: newStatus } as any).eq("id", a.id);
    if (error) { toast.error("Update failed"); return; }
    setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, status: newStatus } : x));
    toast.success(newStatus === "active" ? "Activated" : "Deactivated");
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements" as any).delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setAnnouncements((prev) => prev.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const startEdit = (a: Announcement) => {
    setForm({ title: a.title, message: a.message, cta_label: a.cta_label || "", cta_link: a.cta_link || "" });
    setEditingId(a.id);
    setShowForm(true);
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-4xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/waitlist")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Announcements</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/analytics")} className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> New Announcement
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 md:px-8 py-6 space-y-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">{editingId ? "Edit Announcement" : "New Announcement"}</h3>
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="text-sm"
            />
            <Textarea
              placeholder="Message"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
              className="text-sm resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="CTA label (optional)"
                value={form.cta_label}
                onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="CTA link (optional)"
                value={form.cta_link}
                onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} className="text-xs">{editingId ? "Update" : "Create"}</Button>
              <Button size="sm" variant="ghost" onClick={resetForm} className="text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No announcements yet.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl border bg-card p-4 space-y-2 transition-colors",
                  a.status === "active" ? "border-primary/20" : "border-border opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{a.title}</h4>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        a.status === "active"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        {a.status === "active" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                    {a.cta_label && (
                      <p className="text-[10px] text-primary">CTA: {a.cta_label} → {a.cta_link || "no link"}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleStatus(a)} title="Toggle status">
                      {a.status === "active" ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(a)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAnnouncement(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/50">
                  Created {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
