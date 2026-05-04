import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, TrendingUp, MousePointerClick, Eye } from "lucide-react";

interface SeoRow { page_slug: string; title: string; impressions: number; clicks: number; keywords: string[]; }

export default function SeoSignalsPanel() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    if (!user) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("seo_metadata")
          .select("page_slug, title, impressions, clicks, keywords")
          .order("impressions", { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (!error && data) setRows(data as SeoRow[]);
      } catch { /* silently ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (!user) return null;
  if (loading) return null;

  const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  const topPages = rows.slice(0, 6);
  // Flatten all keywords into a unique deduplicated list sorted by frequency
  const kwFreq: Record<string, number> = {};
  rows.forEach(r => (r.keywords ?? []).forEach(k => { kwFreq[k] = (kwFreq[k] || 0) + 1; }));
  const topKeywords = Object.entries(kwFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SEO Signals</h2>
        <span className="ml-auto text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {rows.length} pages indexed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions</span>
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</span>
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{overallCtr}%</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pages with metadata</h3>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages with SEO metadata yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topPages.map((p) => (
                <div key={p.page_slug} className="flex items-center justify-between text-sm border-b pb-1.5">
                  <span className="truncate mr-2 font-mono text-xs">{p.page_slug}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {p.impressions} imp · {p.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tracked keywords</h3>
          {topKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keyword data yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topKeywords.map((k) => (
                <span
                  key={k}
                  className="text-xs px-2 py-1 rounded-full bg-muted border"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        SEO metadata is set for all pages. Impressions &amp; clicks populate once Google Search Console is connected.
      </p>
    </div>
  );
}
