import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { isFounderAdmin } from "@/lib/admin";
import { Search, AlertTriangle, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoveragePayload {
  total_pages: number;
  pages_with_metadata: number;
  missing_pages: number;
  coverage_percentage: number;
  announcement_pages: number;
  referral_pages: number;
  activation_pages: number;
  landing_pages: number;
  error?: string;
}

interface MissingPayload {
  missing_pages: string[];
  error?: string;
}

export default function SeoCoveragePanel() {
  const { user } = useAuth();
  const [coverage, setCoverage] = useState<CoveragePayload | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFounder = isFounderAdmin(user?.email);

  useEffect(() => {
    if (!isFounder) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [covRes, missRes] = await Promise.all([
          supabase.rpc("get_seo_metadata_coverage" as never),
          supabase.rpc("get_missing_metadata_pages" as never),
        ]);
        if (covRes.error) {
          console.error("[SeoCoveragePanel] coverage RPC error:", covRes.error);
          setErrorMsg(covRes.error.message);
        }
        if (missRes.error) {
          console.error("[SeoCoveragePanel] missing RPC error:", missRes.error);
        }
        const cov = (covRes.data ?? null) as CoveragePayload | null;
        setCoverage(cov);
        if (cov?.error) setErrorMsg(cov.error);
        const m = (missRes.data ?? null) as MissingPayload | null;
        setMissing(Array.isArray(m?.missing_pages) ? m!.missing_pages : []);
      } catch (err: any) {
        console.error("[SeoCoveragePanel]", err);
        setErrorMsg(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [isFounder]);

  // Founder-only — silently hide for everyone else
  if (!isFounder) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!coverage || coverage.error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">SEO coverage unavailable.</p>
      </div>
    );
  }

  const pct = coverage.coverage_percentage ?? 0;
  const scoreColor =
    pct >= 70 ? "text-primary" : pct >= 40 ? "text-yellow-500" : "text-destructive";
  const barColor =
    pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-yellow-500" : "bg-destructive";

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Search className="h-4 w-4" /> SEO Signals
        <span className="text-[10px] text-muted-foreground/70 font-normal normal-case ml-1">(Founder only)</span>
      </h2>

      {/* Coverage score hero */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">SEO Coverage Score</p>
            <p className={cn("text-3xl font-bold tabular-nums", scoreColor)}>{pct}%</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <p>Total Pages: <span className="text-foreground font-medium">{coverage.total_pages}</span></p>
            <p>With Metadata: <span className="text-foreground font-medium">{coverage.pages_with_metadata}</span></p>
            <p>Missing Metadata: <span className="text-foreground font-medium">{coverage.missing_pages}</span></p>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Announcements", value: coverage.announcement_pages },
          { label: "Referral", value: coverage.referral_pages },
          { label: "Activation", value: coverage.activation_pages },
          { label: "Landing", value: coverage.landing_pages },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">pages</p>
          </div>
        ))}
      </div>

      {/* Coverage gaps */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileWarning className="h-3.5 w-3.5" /> Metadata Coverage Gaps
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">{missing.length} missing</span>
        </div>
        {missing.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            All registered pages have SEO metadata.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 30).map((slug) => (
              <span
                key={slug}
                className="text-xs px-2 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-foreground font-mono"
              >
                {slug}
              </span>
            ))}
          </div>
        )}
      </div>

      {pct < 70 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            SEO coverage is below 70%. Generate metadata for the missing pages above to improve organic discovery.
          </p>
        </div>
      )}
    </section>
  );
}
