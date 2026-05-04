import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Inbox, CalendarDays, FolderKanban, BrainCircuit, Mic, Lightbulb, Hourglass, Menu, X, Plus, Radio, RotateCcw, Search, LogIn, LogOut, Cloud, HardDrive, Settings, Crown, Sparkles, HelpCircle, MoreHorizontal, MessageSquare, FileText, Target, BarChart2, Timer, Gift } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useBrain } from "@/context/BrainContext";
import QuickCaptureModal from "@/components/QuickCaptureModal";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import InsightHaloIcon from "@/components/branding/InsightHaloIcon";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useConversionCampaignPrompt } from "@/hooks/useConversionCampaignPrompt";
import { useReminderActivator } from "@/hooks/useReminderActivator";
import ReviewReminderBanner from "@/components/ReviewReminderBanner";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCentre from "@/components/NotificationCentre";
import KeyboardShortcutsOverlay from "@/components/KeyboardShortcutsOverlay";
import CommandPalette from "@/components/CommandPalette";
import WorkspaceSwitcher from "@/components/workspace/WorkspaceSwitcher";

// Users below this capture count see a simplified sidebar — fewer choices
// = lower cognitive load = higher activation conversion.
const SIDEBAR_COMPLEXITY_UNLOCK = 5;

function UpgradePromptBanner({ strength, onShow, onClick, onDismiss }: {
  strength: string; onShow: () => void; onClick: () => void; onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { onShow(); }, []);

  if (dismissed) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 md:px-8">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {strength === "strong" ? "🚀 Upgrade to Pro today!" : "Ready to upgrade to Pro?"}
            </p>
            <p className="text-[10px] text-muted-foreground">Unlock AI-powered intelligence and advanced features.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="gap-1.5 text-xs" onClick={onClick}>
            <Crown className="h-3 w-3" /> Upgrade
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={() => { setDismissed(true); onDismiss(); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sidebar nav grouped for clarity. `essential: true` items always show,
// even for new users. Other items only appear once the user crosses
// SIDEBAR_COMPLEXITY_UNLOCK captures.
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | (() => JSX.Element);
  essential?: boolean;
};

const NAV_PRIMARY: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: () => <InsightHaloIcon size="xs" animated={false} />, essential: true },
  { to: "/inbox", label: "Inbox", icon: Inbox, essential: true },
  { to: "/today", label: "Today", icon: CalendarDays, essential: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/ideas", label: "Ideas Vault", icon: Lightbulb },
  { to: "/someday", label: "Someday", icon: Hourglass },
  { to: "/memory", label: "Memory", icon: Search, essential: true },
];

const NAV_SECONDARY: NavItem[] = [
  { to: "/ai-chat", label: "AI Chat", icon: MessageSquare, essential: true },
  { to: "/goals", label: "Goals", icon: Target, essential: true },
  { to: "/scratchpad", label: "Scratchpad", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/ai-review", label: "AI Review", icon: BrainCircuit },
  { to: "/voice", label: "Voice Capture", icon: Mic },
  { to: "/capture-gateway", label: "Capture Gateway", icon: Radio },
  { to: "/review", label: "Review Rituals", icon: RotateCcw },
  { to: "/review/weekly", label: "Weekly Review", icon: CalendarDays },
];

const NAV_ACCOUNT: NavItem[] = [
  { to: "/whats-new", label: "What's New", icon: Sparkles },
  { to: "/referral", label: "Refer & Earn", icon: Gift, essential: true },
  { to: "/help", label: "How to Use", icon: HelpCircle, essential: true },
  { to: "/settings", label: "Settings", icon: Settings, essential: true },
  { to: "/upgrade", label: "Upgrade", icon: Crown, essential: true },
];

const NAV_LINKS = [...NAV_PRIMARY, ...NAV_SECONDARY, ...NAV_ACCOUNT];

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, cloudAvailable } = useAuth();
  const { captures } = useBrain();
  const campaignPrompt = useConversionCampaignPrompt();

  // Hide secondary nav items until user has built capture habit. Reduces
  // choice paralysis on first sessions; reveals power features as they earn them.
  const showFullNav = captures.length >= SIDEBAR_COMPLEXITY_UNLOCK;
  const navPrimary = useMemo(() => showFullNav ? NAV_PRIMARY : NAV_PRIMARY.filter((l) => l.essential), [showFullNav]);
  const navSecondary = useMemo(() => showFullNav ? NAV_SECONDARY : [], [showFullNav]);
  const navAccount = useMemo(() => showFullNav ? NAV_ACCOUNT : NAV_ACCOUNT.filter((l) => l.essential), [showFullNav]);
  const mobileNavLinks = useMemo(() => [...navPrimary, ...navSecondary, ...navAccount], [navPrimary, navSecondary, navAccount]);

  // Day-2 Retention Loop: surface due reminders as pinned Today captures
  useReminderActivator();

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }
      // Cmd+/ / Ctrl+/ → search
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }
      // Cmd+J / Ctrl+J → quick capture (legacy alias)
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setCaptureOpen((o) => !o);
        return;
      }
      // ? → keyboard shortcuts (only when not in an input/textarea)
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "?" && tag !== "INPUT" && tag !== "TEXTAREA" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5">
          <InsightHaloLogo variant="header" />
        </div>

        <div className="px-3 mb-2 space-y-1.5">
          <Button
            onClick={() => setCaptureOpen(true)}
            className="w-full gap-2 text-xs"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> Quick Capture
          </Button>
          {/* Command palette trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Commands & search…</span>
            <kbd className="rounded border border-sidebar-border px-1 py-0.5 font-mono text-[9px] opacity-60">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Workspace</p>
          <WorkspaceSwitcher />
          {navPrimary.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}>
              <l.icon className="h-4 w-4" />{l.label}
            </NavLink>
          ))}

          {navSecondary.length > 0 && (
            <>
              <p className="px-3 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Tools</p>
              {navSecondary.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}>
                  <l.icon className="h-4 w-4" />{l.label}
                </NavLink>
              ))}
            </>
          )}

          <p className="px-3 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Account</p>
          {navAccount.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}>
              <l.icon className="h-4 w-4" />{l.label}
            </NavLink>
          ))}

          {!showFullNav && (
            <p className="px-3 pt-4 pb-1 text-[10px] text-sidebar-foreground/40 leading-snug">
              More tools unlock as you capture
            </p>
          )}
        </nav>
        {/* Sync status + auth + notification bell */}
        <div className="px-4 py-3 space-y-2 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50">
              {!cloudAvailable ? (
                <><HardDrive className="h-3 w-3" /> Local only</>
              ) : user ? (
                <><Cloud className="h-3 w-3" /> Synced</>
              ) : (
                <><HardDrive className="h-3 w-3" /> Local only</>
              )}
            </div>
            <NotificationCentre />
          </div>
          {cloudAvailable && user ? (
            <button onClick={() => signOut()} className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          ) : cloudAvailable ? (
            <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
              <LogIn className="h-3 w-3" /> Sign in to sync
            </button>
          ) : null}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-background">
          <InsightHaloLogo variant="header" className="text-foreground" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <NotificationCentre />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
           <div className="md:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-sm pt-14 px-4 overflow-y-auto pb-20">
            <nav className="space-y-1">
              {mobileNavLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}
            </nav>
            {/* Mobile logout */}
            {cloudAvailable && user && (
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => { setMobileOpen(false); signOut(); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        )}

        <AnnouncementBanner />
        <ReviewReminderBanner />

        {/* Campaign upgrade prompt */}
        {campaignPrompt.shouldShow && campaignPrompt.strength !== "soft" && (
          <UpgradePromptBanner
            strength={campaignPrompt.strength!}
            onShow={() => campaignPrompt.trackEvent("shown")}
            onClick={() => { campaignPrompt.trackEvent("clicked"); navigate("/upgrade"); }}
            onDismiss={() => campaignPrompt.trackEvent("dismissed")}
          />
        )}
        {/* Main content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10 pb-24 md:pb-10">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-2 py-1.5">
          {/* Home */}
          <NavLink to="/app" end className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }>
            <InsightHaloIcon size="xs" animated={false} />
            <span className="text-[9px] font-medium">Home</span>
          </NavLink>

          {/* Inbox */}
          <NavLink to="/inbox" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }>
            <Inbox className="h-5 w-5" />
            <span className="text-[9px] font-medium">Inbox</span>
          </NavLink>

          {/* Centre capture button */}
          <button
            onClick={() => setCaptureOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5"
            aria-label="Quick Capture"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all">
              <Plus className="h-5 w-5" />
            </div>
          </button>

          {/* Today */}
          <NavLink to="/today" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }>
            <CalendarDays className="h-5 w-5" />
            <span className="text-[9px] font-medium">Today</span>
          </NavLink>

          {/* More — opens full overlay nav */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Desktop floating capture button — only on desktop */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="hidden md:flex fixed right-8 bottom-8 z-40 h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        aria-label="Quick Capture"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Quick Capture Modal */}
      <QuickCaptureModal open={captureOpen} onOpenChange={setCaptureOpen} />

      {/* Command Palette — Cmd+K */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenCapture={() => { setCommandOpen(false); setCaptureOpen(true); }}
      />

      {/* Global Search */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
