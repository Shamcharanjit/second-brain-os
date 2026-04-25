import { useEffect, useState } from "react";
import { Globe, Loader2, MapPin, Trophy, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type GeographyPayload = {
  total_by_country?: Record<string, number>;
  activated_by_country?: Record<string, number>;
  activation_rate_by_country?: Record<string, number>;
  india_count?: number;
  international_count?: number;
  unknown_count?: number;
  top_country?: string;
  top_country_count?: number;
  best_activation_country?: string;
  best_activation_rate?: number;
  error?: string;
};

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(217 91% 60%)",
  "hsl(45 93% 58%)",
  "hsl(280 70% 60%)",
  "hsl(340 75% 60%)",
  "hsl(160 60% 45%)",
  "hsl(20 85% 60%)",
  "hsl(200 70% 50%)",
];

export default function UserGeographyPanel() {
  const [data, setData] = useState<GeographyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: result, error } = await supabase.rpc("get_user_geography_analytics" as never);
        if (error) console.error("[UserGeographyPanel]", error);
        setData((result ?? null) as GeographyPayload | null);
      } catch (err) {
        console.error("[UserGeographyPanel] fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Globe className="h-4 w-4" /> User Geography
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {data?.error === "forbidden" ? "Founder access required." : "No geography data yet."}
          </p>
        </div>
      </section>
    );
  }

  const totals = data.total_by_country ?? {};
  const rates = data.activation_rate_by_country ?? {};
  const activated = data.activated_by_country ?? {};
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((sum, [, n]) => sum + n, 0) || 1;

  // Build conic-gradient slices for donut
  let cursor = 0;
  const slices = sorted.map(([country, count], i) => {
    const start = (cursor / grandTotal) * 360;
    cursor += count;
    const end = (cursor / grandTotal) * 360;
    return { country, count, color: PALETTE[i % PALETTE.length], start, end };
  });
  const conic = slices.length
    ? `conic-gradient(${slices.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(", ")})`
    : "hsl(var(--muted))";

  const indiaPct = Math.round(((data.india_count ?? 0) / grandTotal) * 100);
  const intlPct = Math.round(((data.international_count ?? 0) / grandTotal) * 100);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Globe className="h-4 w-4" /> User Geography
      </h2>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" /> Top Country
          </div>
          <p className="text-2xl font-bold text-foreground">{data.top_country || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{data.top_country_count ?? 0} users</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-blue-500" /> Best Activation Country
          </div>
          <p className="text-2xl font-bold text-foreground">{data.best_activation_country || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{data.best_activation_rate ?? 0}% activation rate</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> Unknown Country
          </div>
          <p className="text-2xl font-bold text-foreground">{data.unknown_count ?? 0}</p>
          <p className="text-xs text-muted-foreground">users without geo data</p>
        </div>
      </div>

      {/* Donut + India vs International */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Country Distribution</p>
          <div className="flex items-center gap-5">
            <div
              className="relative h-32 w-32 rounded-full shrink-0"
              style={{ background: conic }}
            >
              <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center flex-col">
                <span className="text-lg font-bold text-foreground tabular-nums">{grandTotal}</span>
                <span className="text-[10px] text-muted-foreground">total</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {slices.slice(0, 6).map((s) => (
                <div key={s.country} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 truncate text-foreground">{s.country}</span>
                  <span className="text-muted-foreground tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">India vs International</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-medium">🇮🇳 India</span>
                <span className="text-muted-foreground tabular-nums">{data.india_count ?? 0} ({indiaPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${indiaPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-medium">🌍 International</span>
                <span className="text-muted-foreground tabular-nums">{data.international_count ?? 0} ({intlPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${intlPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">❓ Unknown</span>
                <span className="text-muted-foreground tabular-nums">
                  {data.unknown_count ?? 0} ({Math.round(((data.unknown_count ?? 0) / grandTotal) * 100)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/40 rounded-full"
                  style={{ width: `${Math.round(((data.unknown_count ?? 0) / grandTotal) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top countries table */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Top Countries</p>
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
            <div className="col-span-5">Country</div>
            <div className="col-span-2 text-right">Users</div>
            <div className="col-span-2 text-right">Activated</div>
            <div className="col-span-3 text-right">Activation Rate</div>
          </div>
          {sorted.slice(0, 10).map(([country, total]) => {
            const rate = Number(rates[country] ?? 0);
            const rateColor = rate >= 60 ? "text-primary" : rate >= 30 ? "text-blue-500" : rate >= 10 ? "text-yellow-500" : "text-muted-foreground";
            return (
              <div key={country} className="grid grid-cols-12 gap-2 items-center py-1.5 text-xs">
                <div className="col-span-5 text-foreground truncate">{country}</div>
                <div className="col-span-2 text-right tabular-nums text-foreground">{total}</div>
                <div className="col-span-2 text-right tabular-nums text-muted-foreground">{activated[country] ?? 0}</div>
                <div className={cn("col-span-3 text-right tabular-nums font-semibold", rateColor)}>{rate}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      {data.top_country && data.top_country !== "Unknown" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            💡 Your strongest audience is <span className="font-semibold text-primary">{data.top_country}</span>.
            {" "}Consider targeting similar users here.
          </p>
        </div>
      )}
    </section>
  );
}
