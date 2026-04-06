import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Inbox, CalendarDays, FolderKanban, BrainCircuit, Mic, Lightbulb, Menu, X, Plus, Radio, RotateCcw, Search, LogIn, LogOut, Cloud, HardDrive, Settings, Crown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import QuickCaptureModal from "@/components/QuickCaptureModal";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import InsightHaloIcon from "@/components/branding/InsightHaloIcon";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: () => <InsightHaloIcon size="xs" animated={false} /> },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/today", label: "Today", icon: CalendarDays },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/ai-review", label: "AI Review", icon: BrainCircuit },
  { to: "/voice", label: "Voice Capture", icon: Mic },
  { to: "/capture-gateway", label: "Capture Gateway", icon: Radio },
  { to: "/review", label: "Review Rituals", icon: RotateCcw },
  { to: "/memory", label: "Memory", icon: Search },
  { to: "/ideas", label: "Ideas Vault", icon: Lightbulb },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/upgrade", label: "Upgrade", icon: Crown },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, cloudAvailable } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5">
          <InsightHaloLogo variant="header" />
        </div>

        <div className="px-3 mb-3">
          <Button
            onClick={() => setCaptureOpen(true)}
            className="w-full gap-2 text-xs"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> Quick Capture
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        {/* Sync status + auth */}
        <div className="px-4 py-3 space-y-2 border-t border-sidebar-border">
          <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50">
            {!cloudAvailable ? (
              <><HardDrive className="h-3 w-3" /> Local only (no cloud configured)</>
            ) : user ? (
              <><Cloud className="h-3 w-3" /> Synced to cloud</>
            ) : (
              <><HardDrive className="h-3 w-3" /> Local only</>
            )}
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
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-sm pt-14 px-4">
            <nav className="space-y-1">
              {NAV_LINKS.map((l) => (
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
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </div>

      {/* Floating capture button */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Quick Capture"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Quick Capture Modal */}
      <QuickCaptureModal open={captureOpen} onOpenChange={setCaptureOpen} />
    </div>
  );
}
