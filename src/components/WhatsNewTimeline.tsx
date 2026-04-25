import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchFeatureUpdates, fetchSeenIds, markAnnouncementSeen, formatUpdateDate, type FeatureUpdate } from "@/lib/whats-new";

type Props = {
  /** When true, marks all visible updates as seen on mount (used by the dedicated /whats-new page). */
  markAllSeenOnMount?: boolean;
  /** Limit number of items shown (e.g. settings preview). */
  limit?: number;
};

export default function WhatsNewTimeline({ markAllSeenOnMount = false, limit }: Props) {
  const { user, cloudAvailable } = useAuth();
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchFeatureUpdates();
      if (cancelled) return;
      setUpdates(list);
      setLoading(false);

      if (markAllSeenOnMount && user && cloudAvailable) {
        const seen = await fetchSeenIds(user.id);
        const toMark = list.filter((u) => !seen.has(u.id));
        await Promise.all(toMark.map((u) => markAnnouncementSeen(user.id, u.id)));
      }
    })();
    return () => { cancelled = true; };
  }, [user, cloudAvailable, markAllSeenOnMount]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Sparkles className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No updates yet — your second brain is brewing something new.
        </p>
      </div>
    );
  }

  const visible = limit ? updates.slice(0, limit) : updates;

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {visible.map((u) => (
        <li key={u.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {formatUpdateDate(u.created_at)}
              </span>
              {u.version_tag && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {u.version_tag}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">{u.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{u.message}</p>
            {u.cta_label && u.cta_link && (
              <a
                href={u.cta_link}
                className="inline-block mt-1 text-xs font-medium text-primary hover:underline"
              >
                {u.cta_label} →
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
