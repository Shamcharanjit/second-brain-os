import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Brain, ArrowLeft, RefreshCw, Users, UserCheck, Clock,
  TrendingUp, BarChart3, Activity, Loader2, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, isAfter } from "date-fns";

type WaitlistEntry = {
  id: string;
  status: string;
  invited: boolean;
  invite_token: string | null;
  created_at: string;
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  accent?: boolean;
};

function StatCard({ label, value, icon: Icon, subtitle, accent }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className={cn("text-3xl font-bold tracking-tight", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [totalAuthUsers, setTotalAuthUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("waitlist_signups" as any)
        .select("id, status, invited, invite_token, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaitlist((data as any as WaitlistEntry[]) || []);
    } catch (e) {
      toast.error("Failed to load analytics data");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (cloudAvailable && user) fetchData();
  }, [cloudAvailable, user]);

  const metrics = useMemo(() => {
    const total = waitlist.length;
    const pending = waitlist.filter((e) => e.status === "pending").length;
    const invited = waitlist.filter((e) => e.invited).length;
    const reviewed = waitlist.filter((e) => e.status === "reviewed").length;
    const withToken = waitlist.filter((e) => e.invite_token).length;
    const conversionRate = invited > 0 ? Math.round((invited / total) * 100) : 0;

    const sevenDaysAgo = subDays(new Date(), 7);
    const newLast7 = waitlist.filter((e) => isAfter(new Date(e.created_at), sevenDaysAgo)).length;

    // Daily breakdown for last 7 days
    const dailyBreakdown: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, "yyyy-MM-dd");
      const count = waitlist.filter((e) => format(new Date(e.created_at), "yyyy-MM-dd") === dayStr).length;
      dailyBreakdown.push({ date: format(day, "MMM d"), count });
    }

    return { total, pending, invited, reviewed, withToken, conversionRate, newLast7, dailyBreakdown };
  }, [waitlist]);

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

  const maxDailyCount = Math.max(...metrics.dailyBreakdown.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Founder Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/waitlist")} className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Waitlist Admin
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-8 space-y-8">
          {/* Waitlist Metrics */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" /> Waitlist Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Signups" value={metrics.total} icon={Users} accent />
              <StatCard label="Pending" value={metrics.pending} icon={Clock} subtitle="Awaiting review" />
              <StatCard label="Invited" value={metrics.invited} icon={UserCheck} accent />
              <StatCard label="Reviewed" value={metrics.reviewed} icon={ShieldCheck} />
            </div>
          </section>

          {/* Invite Funnel */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Invite Funnel
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Invites Issued" value={metrics.withToken} icon={UserCheck} />
              <StatCard
                label="Invite Rate"
                value={`${metrics.conversionRate}%`}
                icon={TrendingUp}
                accent
                subtitle={`${metrics.invited} of ${metrics.total} signups invited`}
              />
              <StatCard
                label="Pending Invites"
                value={metrics.total - metrics.invited}
                icon={Clock}
                subtitle="Users awaiting invite"
              />
            </div>
          </section>

          {/* Growth — last 7 days */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" /> Growth — Last 7 Days
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="New Signups (7d)"
                value={metrics.newLast7}
                icon={BarChart3}
                accent
                subtitle={`avg ${(metrics.newLast7 / 7).toFixed(1)}/day`}
              />
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium text-muted-foreground mb-4">Daily Signups</p>
                <div className="flex items-end gap-2 h-32">
                  {metrics.dailyBreakdown.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-foreground">{d.count}</span>
                      <div
                        className="w-full rounded-t-md bg-primary/80 transition-all"
                        style={{
                          height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`,
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Status Breakdown Table */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Status Breakdown
            </h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Count</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Share</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground w-1/3">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Pending", count: metrics.pending, color: "bg-muted-foreground" },
                    { label: "Invited", count: metrics.invited, color: "bg-primary" },
                    { label: "Reviewed", count: metrics.reviewed, color: "bg-accent-foreground" },
                  ].map((row) => {
                    const pct = metrics.total > 0 ? Math.round((row.count / metrics.total) * 100) : 0;
                    return (
                      <tr key={row.label} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{row.label}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{row.count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{pct}%</td>
                        <td className="px-5 py-3">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", row.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
