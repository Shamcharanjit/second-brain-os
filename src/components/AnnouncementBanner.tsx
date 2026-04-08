import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_link: string | null;
};

const DISMISS_KEY = "insighthalo_dismissed_announcements";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
  }
}

export default function AnnouncementBanner() {
  const { user, cloudAvailable } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!cloudAvailable || !user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("announcements" as any)
        .select("id, title, message, cta_label, cta_link")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      const latest = (data as any as Announcement[])?.[0];
      if (latest && !getDismissed().includes(latest.id)) {
        setAnnouncement(latest);
        setVisible(true);
      }
    };

    fetch();
  }, [cloudAvailable, user]);

  const dismiss = () => {
    if (announcement) addDismissed(announcement.id);
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center gap-3">
        <Megaphone className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{announcement.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{announcement.message}</p>
        </div>
        {announcement.cta_label && announcement.cta_link && (
          <a
            href={announcement.cta_link}
            className={cn(
              "shrink-0 inline-flex items-center text-[11px] font-medium px-3 py-1 rounded-md",
              "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            )}
          >
            {announcement.cta_label}
          </a>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
