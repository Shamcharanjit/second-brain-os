import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchFeatureUpdates, fetchSeenIds, markAnnouncementSeen, type FeatureUpdate } from "@/lib/whats-new";
import { isFounderAdmin } from "@/lib/admin";

const NEW_USER_GRACE_PERIOD_DAYS = 7;

function isNewAccount(user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user?.created_at) return false;
  const ageMs = Date.now() - new Date(user.created_at).getTime();
  return ageMs < NEW_USER_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}

export default function WhatsNewBanner() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [latest, setLatest] = useState<FeatureUpdate | null>(null);
  const [hidden, setHidden] = useState(false);
  const isAdmin = isFounderAdmin(user?.email);

  useEffect(() => {
    if (!cloudAvailable || !user) return;
    if (isNewAccount(user)) return;
    let cancelled = false;
    (async () => {
      const [updates, seen] = await Promise.all([fetchFeatureUpdates({ isAdmin }), fetchSeenIds(user.id)]);
      if (cancelled) return;
      const unseen = updates.find((u) => !seen.has(u.id));
      if (unseen) setLatest(unseen);
    })();
    return () => { cancelled = true; };
  }, [user, cloudAvailable, isAdmin]);

  const dismiss = async () => {
    if (latest && user) await markAnnouncementSeen(user.id, latest.id);
    setHidden(true);
  };

  const view = async () => {
    if (latest && user) await markAnnouncementSeen(user.id, latest.id);
    navigate("/whats-new");
  };

  if (!latest || hidden) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              ✨ New in InsightHalo
            </span>
            {latest.version_tag && (
              <span className="text-[10px] text-muted-foreground">{latest.version_tag}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{latest.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latest.message}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="text-xs h-8" onClick={view}>
            See what's new
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
