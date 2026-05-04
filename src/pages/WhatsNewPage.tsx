import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Loader2, ArrowRight, Zap, Wrench, Shield, Star,
  Bell, Rocket,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isFounderAdmin } from "@/lib/admin";
import {
  fetchFeatureUpdates,
  fetchSeenIds,
  markAnnouncementSeen,
  formatUpdateDate,
  type FeatureUpdate,
} from "@/lib/whats-new";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Assign a visual badge based on title keywords */
function getBadge(title: string): { label: string; color: string; Icon: any } {
  const t = title.toLowerCase();
  if (t.includes("fix") || t.includes("improved") || t.includes("better"))
    return { label: "Improvement", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", Icon: Wrench };
  if (t.includes("security") || t.includes("private") || t.includes("auth"))
    return { label: "Security", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", Icon: Shield };
  if (t.includes("beta") || t.includes("preview") || t.includes("early"))
    return { label: "Beta", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", Icon: Star };
  return { label: "New", color: "bg-primary/10 text-primary", Icon: Zap };
}

/** Group updates by version_tag, then by month for untagged */
function groupUpdates(updates: FeatureUpdate[]): { label: string; items: FeatureUpdate[] }[] {
  const groups: Map<string, FeatureUpdate[]> = new Map();
  for (const u of updates) {
    const key = u.version_tag ?? formatMonth(u.created_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function formatMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch {
    return "Recent";
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function UpdateCard({
  update,
  isNew,
}: {
  update: FeatureUpdate;
  isNew: boolean;
}) {
  const badge = getBadge(update.title);
  const BadgeIcon = badge.Icon;

  return (
    <div
      className={`relative rounded-xl border bg-card p-5 space-y-2.5 transition-all ${
        isNew ? "border-primary/30 shadow-sm" : ""
      }`}
    >
      {/* New dot */}
      {isNew && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}

      {/* Badge + date row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.color}`}
        >
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatUpdateDate(update.created_at)}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold leading-snug">{update.title}</p>

      {/* Message */}
      <p className="text-xs text-muted-foreground leading-relaxed">{update.message}</p>

      {/* CTA */}
      {update.cta_label && update.cta_link && (
        <div className="pt-1">
          {update.cta_link.startsWith("/") ? (
            <Link
              to={update.cta_link}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {update.cta_label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <a
              href={update.cta_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {update.cta_label}
              <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function WhatsNewPage() {
  const { user, cloudAvailable } = useAuth();
  const isAdmin = isFounderAdmin(user?.email);
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchFeatureUpdates({ isAdmin });
      if (cancelled) return;
      setUpdates(list);
      setLoading(false);

      if (user && cloudAvailable) {
        const seen = await fetchSeenIds(user.id);
        if (!cancelled) setSeenIds(seen);
        // Mark all as seen
        const toMark = list.filter((u) => !seen.has(u.id));
        await Promise.all(toMark.map((u) => markAnnouncementSeen(user.id, u.id)));
      }
    })();
    return () => { cancelled = true; };
  }, [user, cloudAvailable, isAdmin]);

  const newCount = updates.filter((u) => !seenIds.has(u.id)).length;
  const groups = groupUpdates(updates);

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">What's New</h1>
              <p className="text-xs text-muted-foreground">
                Every improvement we ship — your second brain keeps getting sharper.
              </p>
            </div>
          </div>
          {newCount > 0 && !loading && (
            <span className="text-xs font-semibold bg-primary text-white px-2.5 py-1 rounded-full">
              {newCount} new
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {[
            { label: "New feature", color: "bg-primary/10 text-primary", Icon: Zap },
            { label: "Improvement", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", Icon: Wrench },
          ].map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${b.color}`}
            >
              <b.Icon className="h-3 w-3" />
              {b.label}
            </span>
          ))}
        </div>
      </header>

      {/* Subscribe nudge */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/20 p-4">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">
          Enable push notifications to get notified when we ship something new.
        </p>
        <Link
          to="/settings"
          className="text-xs font-medium text-primary hover:underline shrink-0"
        >
          Enable →
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!loading && updates.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center space-y-2">
          <Sparkles className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">Nothing yet</p>
          <p className="text-xs text-muted-foreground">
            Your second brain is brewing something new. Check back soon.
          </p>
        </div>
      )}

      {/* Groups */}
      {!loading && groups.map(({ label, items }) => (
        <section key={label} className="space-y-3">
          {/* Version / month header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {label.startsWith("v") ? (
                <span className="text-xs font-bold bg-foreground text-background px-2 py-0.5 rounded">
                  {label}
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
              )}
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((u) => (
              <UpdateCard key={u.id} update={u} isNew={!seenIds.has(u.id)} />
            ))}
          </div>
        </section>
      ))}

      {/* Footer */}
      {!loading && updates.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pb-4">
          You're all caught up · {updates.length} updates total
        </p>
      )}

    </div>
  );
}
