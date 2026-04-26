import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, TrendingUp, Users, CheckCircle2, Globe2 } from "lucide-react";

interface LandingRow { landing_page: string; visitors: number; signups: number; activations: number; conversion_rate: number; }
interface CountryRow { country: string; search_visitors: number; signups: number; activations: number; }
interface SourceRow { source: string; visitors: number; signups: number; activations: number; }
interface SeoPerf {
  source_counts: Record<string, number>;
  search_visitors: number;
  search_signups: number;
  search_activations: number;
  search_to_signup_rate: number;
  search_to_activation_rate: number;
  landing_page_performance: LandingRow[];
  country_performance: CountryRow[];
  top_search_sources: SourceRow[];
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  yahoo: "Yahoo",
  yandex: "Yandex",
  baidu: "Baidu",
  ecosia: "Ecosia",
  brave: "Brave",
  social: "Social",
  direct: "Direct",
  unknown: "Unknown",
};

export default function SeoPerformancePanel() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SeoPerf | null>(null);
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
        const { data: rpcData, error } = await supabase.rpc("get_seo_performance_signals" as any);
        if (cancelled) return;
        if (error) {
          console.warn("[SeoPerformancePanel] RPC error:", error.message);
          setData(null);
        } else {
          setData((rpcData ?? null) as unknown as SeoPerf | null);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name === "AbortError") return;
        console.warn("[SeoPerformancePanel] unexpected:", err?.message ?? err);
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

  const sources = Object.entries(data.source_counts || {}).sort((a, b) => b[1] - a[1]);
  const landingPages = Array.isArray(data.landing_page_performance) ? data.landing_page_performance : [];
  const countryPerf = Array.isArray(data.country_performance) ? data.country_performance : [];
  const topSources = Array.isArray(data.top_search_sources) ? data.top_search_sources : [];

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SEO Performance</h2>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">
          Founder
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={Search} label="Search Visitors" value={data.search_visitors} />
        <MetricCard icon={Users} label="Search Signups" value={data.search_signups} />
        <MetricCard icon={CheckCircle2} label="Search Activations" value={data.search_activations} />
        <MetricCard icon={TrendingUp} label="Conversion Rate" value={`${data.search_to_signup_rate}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Source breakdown</h3>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traffic data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {sources.map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm border-b pb-1.5">
                  <span>{SOURCE_LABELS[key] ?? key}</span>
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top search sources</h3>
          {topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No search traffic yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topSources.map((s) => (
                <div key={s.source} className="flex items-center justify-between text-sm border-b pb-1.5">
                  <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {s.visitors} visits · {s.signups} signups · {s.activations} active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Landing page performance</h3>
        {landingPages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No landing data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-1.5 pr-3">Page</th>
                  <th className="text-right py-1.5 px-2">Visitors</th>
                  <th className="text-right py-1.5 px-2">Signups</th>
                  <th className="text-right py-1.5 px-2">Active</th>
                  <th className="text-right py-1.5 pl-2">CVR</th>
                </tr>
              </thead>
              <tbody>
                {landingPages.map((p) => (
                  <tr key={p.landing_page} className="border-b">
                    <td className="py-1.5 pr-3 font-mono text-xs truncate max-w-[200px]">{p.landing_page}</td>
                    <td className="text-right tabular-nums px-2">{p.visitors}</td>
                    <td className="text-right tabular-nums px-2">{p.signups}</td>
                    <td className="text-right tabular-nums px-2">{p.activations}</td>
                    <td className="text-right tabular-nums pl-2">{p.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Globe2 className="h-3.5 w-3.5" /> Search by country
        </h3>
        {data.country_performance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No country data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-1.5 pr-3">Country</th>
                  <th className="text-right py-1.5 px-2">Visitors</th>
                  <th className="text-right py-1.5 px-2">Signups</th>
                  <th className="text-right py-1.5 pl-2">Activations</th>
                </tr>
              </thead>
              <tbody>
                {data.country_performance.map((c) => (
                  <tr key={c.country} className="border-b">
                    <td className="py-1.5 pr-3">{c.country}</td>
                    <td className="text-right tabular-nums px-2">{c.search_visitors}</td>
                    <td className="text-right tabular-nums px-2">{c.signups}</td>
                    <td className="text-right tabular-nums pl-2">{c.activations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Attribution captured on first visit via referrer + UTM parameters. Linked to user on signup.
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
