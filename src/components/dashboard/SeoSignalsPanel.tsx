import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, TrendingUp, MousePointerClick, Eye } from "lucide-react";

interface PageRow { page_slug: string; title: string; impressions: number; clicks: number; ctr: number; }
interface KwRow { keyword: string; impressions: number; }
interface SeoSignals {
  top_pages: PageRow[];
  top_keywords: KwRow[];
  total_impressions: number;
  total_clicks: number;
  overall_ctr: number;
  error?: string;
}

export default function SeoSignalsPanel() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SeoSignals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: rpcData, error } = await supabase.rpc("get_seo_signals" as any);
        if (cancelled) return;
        if (error) {
          console.warn("[SeoSignalsPanel] RPC error:", error.message);
          setData(null);
        } else {
          setData((rpcData ?? null) as unknown as SeoSignals | null);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name === "AbortError") return;
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (!user) return null;
  if (loading) return null;
  if (!data || data.error) return null;

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SEO Signals</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressions</span>
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{data.total_impressions}</p>
        </div>
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</span>
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{data.total_clicks}</p>
        </div>
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{data.overall_ctr}%</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top landing pages</h3>
          {data.top_pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SEO data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.top_pages.slice(0, 6).map((p) => (
                <div key={p.page_slug} className="flex items-center justify-between text-sm border-b pb-1.5">
                  <span className="truncate mr-2 font-mono text-xs">{p.page_slug}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {p.impressions} · {p.ctr}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top keywords</h3>
          {data.top_keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keyword data yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.top_keywords.slice(0, 12).map((k) => (
                <span
                  key={k.keyword}
                  className="text-xs px-2 py-1 rounded-full bg-muted border"
                >
                  {k.keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        SEO impressions and clicks are tracked from organic traffic over time.
      </p>
    </div>
  );
}
