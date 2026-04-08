import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { isFounderAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain, ArrowLeft, RefreshCw, Loader2, Crown, Users,
  Check, X, Shield, Sparkles, UserCheck, Edit2, Save, Globe, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  price_usd: number;
  price_inr: number;
  billing_cycle: string;
  is_active: boolean;
  feature_flags: Record<string, any>;
  display_order: number;
  created_at: string;
};

type UserSub = {
  id: string;
  user_id: string;
  plan_tier: string;
  subscription_status: string;
  is_early_access: boolean;
  is_founder_assigned: boolean;
  billing_region: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  created_at: string;
};

export default function AdminPlansPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<UserSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editPriceInr, setEditPriceInr] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, subsRes] = await Promise.all([
      supabase.from("subscription_plans" as any).select("*").order("display_order" as any, { ascending: true }),
      supabase.from("user_subscriptions" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (plansRes.data) setPlans(plansRes.data as any as Plan[]);
    if (subsRes.data) setSubs(subsRes.data as any as UserSub[]);
    setLoading(false);
  };

  useEffect(() => { if (cloudAvailable && user) fetchData(); }, [cloudAvailable, user]);

  if (!cloudAvailable || !user || !isFounderAdmin(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to access this page.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const togglePlanActive = async (plan: Plan) => {
    const { error } = await supabase.from("subscription_plans" as any).update({ is_active: !plan.is_active } as any).eq("id", plan.id);
    if (error) { toast.error("Update failed"); return; }
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    toast.success(`${plan.name} ${!plan.is_active ? "activated" : "deactivated"}`);
  };

  const savePlanPrice = async (plan: Plan) => {
    const priceUsd = parseFloat(editPrice);
    const priceInr = parseFloat(editPriceInr);
    if (isNaN(priceUsd) || priceUsd < 0 || isNaN(priceInr) || priceInr < 0) { toast.error("Invalid price"); return; }
    const { error } = await supabase.from("subscription_plans" as any).update({ price_usd: priceUsd, price_inr: priceInr } as any).eq("id", plan.id);
    if (error) { toast.error("Update failed"); return; }
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_usd: priceUsd, price_inr: priceInr } : p));
    setEditingPlan(null);
    toast.success("Price updated");
  };

  const assignUserPlan = async (sub: UserSub, planTier: string, isEarlyAccess: boolean, isFounderAssigned: boolean = false) => {
    setUpdatingUser(sub.id);
    const { error } = await supabase.from("user_subscriptions" as any).update({
      plan_tier: planTier,
      is_early_access: isEarlyAccess,
      is_founder_assigned: isFounderAssigned,
      subscription_status: planTier === "pro" ? "active" : "none",
      plan_started_at: new Date().toISOString(),
    } as any).eq("id", sub.id);
    if (error) { toast.error("Update failed"); setUpdatingUser(null); return; }
    setSubs(prev => prev.map(s => s.id === sub.id ? {
      ...s,
      plan_tier: planTier,
      is_early_access: isEarlyAccess,
      is_founder_assigned: isFounderAssigned,
      subscription_status: planTier === "pro" ? "active" : "none",
      plan_started_at: new Date().toISOString(),
    } : s));
    setUpdatingUser(null);
    toast.success(`User plan updated to ${planTier}${isEarlyAccess ? " (Early Access)" : ""}${isFounderAssigned ? " — Founder assigned" : ""}`);
  };

  const setUserRegion = async (sub: UserSub, region: string) => {
    setUpdatingUser(sub.id);
    const { error } = await supabase.from("user_subscriptions" as any).update({ billing_region: region } as any).eq("id", sub.id);
    if (error) { toast.error("Update failed"); setUpdatingUser(null); return; }
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, billing_region: region } : s));
    setUpdatingUser(null);
    toast.success(`Billing region set to ${region}`);
  };

  const earlyAccessCount = subs.filter(s => s.is_early_access).length;
  const proCount = subs.filter(s => s.plan_tier === "pro" && !s.is_early_access).length;
  const freeCount = subs.filter(s => s.plan_tier === "free" && !s.is_early_access).length;
  const indiaCount = subs.filter(s => s.billing_region === "india").length;
  const internationalCount = subs.filter(s => s.billing_region === "international").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-5xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Plan Management</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/analytics")} className="gap-1.5 text-xs">Analytics</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/waitlist")} className="gap-1.5 text-xs">Waitlist</Button>
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
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-8 space-y-8">

          {/* Plan + region distribution stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Early Access", value: earlyAccessCount, icon: Sparkles, color: "text-primary" },
              { label: "Pro (Paid)", value: proCount, icon: Crown, color: "text-primary" },
              { label: "Free", value: freeCount, icon: Users, color: "text-muted-foreground" },
              { label: "India", value: indiaCount, icon: MapPin, color: "text-primary" },
              { label: "International", value: internationalCount, icon: Globe, color: "text-muted-foreground" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <s.icon className={cn("h-4 w-4", s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Plans catalog */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className={cn(
                  "rounded-xl border p-5 space-y-3",
                  plan.is_active ? "border-primary/20 bg-card" : "border-border bg-muted/30 opacity-60"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {plan.price_usd === 0 ? <Sparkles className="h-4 w-4 text-primary" /> : <Crown className="h-4 w-4 text-primary" />}
                      <span className="text-sm font-semibold">{plan.name}</span>
                    </div>
                    <button
                      onClick={() => togglePlanActive(plan)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        plan.is_active ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {editingPlan === plan.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                            className="h-8 w-20 text-sm" type="number" min={0} step={1} autoFocus />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">₹</span>
                          <Input value={editPriceInr} onChange={(e) => setEditPriceInr(e.target.value)}
                            className="h-8 w-20 text-sm" type="number" min={0} step={1} />
                        </div>
                        <Button size="sm" className="h-7 px-2" onClick={() => savePlanPrice(plan)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingPlan(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3">
                        <div>
                          <span className="text-2xl font-bold">${plan.price_usd}</span>
                          <span className="text-xs text-muted-foreground">/{plan.billing_cycle}</span>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="text-lg font-semibold">₹{plan.price_inr}</span>
                          <span className="text-xs">/{plan.billing_cycle}</span>
                        </div>
                        <button
                          onClick={() => { setEditingPlan(plan.id); setEditPrice(String(plan.price_usd)); setEditPriceInr(String(plan.price_inr)); }}
                          className="ml-2 p-1 rounded hover:bg-muted"
                        >
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>AI Triage: {plan.feature_flags?.ai_triage_per_day || "—"}/day</p>
                    <p>Pro Features: {plan.feature_flags?.pro_features ? "Yes" : "No"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* User subscriptions */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" /> User Subscriptions ({subs.length})
            </h2>
            {subs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No subscriptions yet</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User ID</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Plan</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Region</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Early Access</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Started</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map(sub => (
                        <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{sub.user_id.slice(0, 8)}…</td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              sub.plan_tier === "pro" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                            )}>
                              {sub.plan_tier}
                            </span>
                            {sub.is_founder_assigned && (
                              <span className="ml-1 text-[9px] text-muted-foreground">(founder)</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setUserRegion(sub, sub.billing_region === "india" ? "international" : "india")}
                                disabled={updatingUser === sub.id}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border font-medium cursor-pointer hover:opacity-80",
                                  sub.billing_region === "india"
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {sub.billing_region === "india" ? "🇮🇳 India" : "🌍 Intl"}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{sub.subscription_status}</td>
                          <td className="px-4 py-2.5">
                            {sub.is_early_access ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                <Sparkles className="h-2.5 w-2.5" /> Yes
                              </span>
                            ) : <span className="text-xs text-muted-foreground/40">No</span>}
                          </td>
                          <td className="px-4 py-2.5 text-[10px] text-muted-foreground">
                            {sub.plan_started_at ? new Date(sub.plan_started_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              {sub.plan_tier !== "pro" && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-6 text-[10px] gap-1 px-2"
                                  disabled={updatingUser === sub.id}
                                  onClick={() => assignUserPlan(sub, "pro", false, true)}
                                >
                                  {updatingUser === sub.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Crown className="h-2.5 w-2.5" />}
                                  Pro
                                </Button>
                              )}
                              {!sub.is_early_access && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-6 text-[10px] gap-1 px-2"
                                  disabled={updatingUser === sub.id}
                                  onClick={() => assignUserPlan(sub, "pro", true, true)}
                                >
                                  {updatingUser === sub.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                                  Early Access
                                </Button>
                              )}
                              {(sub.plan_tier === "pro" || sub.is_early_access) && (
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-6 text-[10px] gap-1 px-2 text-muted-foreground"
                                  disabled={updatingUser === sub.id}
                                  onClick={() => assignUserPlan(sub, "free", false, false)}
                                >
                                  Free
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
