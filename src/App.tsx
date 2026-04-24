import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { BrainProvider } from "@/context/BrainContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { MemoryProvider } from "@/context/MemoryContext";
import { ReviewMetaProvider } from "@/context/ReviewMetaContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import InboxPage from "@/pages/InboxPage";
import TodayPage from "@/pages/TodayPage";
import ProjectsPage from "@/pages/ProjectsPage";
import AIReviewPage from "@/pages/AIReviewPage";
import VoiceCapturePage from "@/pages/VoiceCapturePage";
import IdeasVaultPage from "@/pages/IdeasVaultPage";
import CaptureGatewayPage from "@/pages/CaptureGatewayPage";
import ReviewRitualsPage from "@/pages/ReviewRitualsPage";
import MemoryPage from "@/pages/MemoryPage";
import AuthPage from "@/pages/AuthPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import SettingsPage from "@/pages/SettingsPage";
import UpgradePage from "@/pages/UpgradePage";
import WaitlistPage from "@/pages/WaitlistPage";
import AdminWaitlistPage from "@/pages/AdminWaitlistPage";
import AdminAnalyticsPage from "@/pages/AdminAnalyticsPage";
import AdminAnnouncementsPage from "@/pages/AdminAnnouncementsPage";
import InvitePage from "@/pages/InvitePage";
import AdminPlansPage from "@/pages/AdminPlansPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import AppErrorBoundary from "@/components/system/AppErrorBoundary";
import PageErrorBoundary from "@/components/system/PageErrorBoundary";

const queryClient = new QueryClient();

function AppProvidersShell() {
  return (
    <BrainProvider>
      <ProjectProvider>
        <MemoryProvider>
          <ReviewMetaProvider>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ReviewMetaProvider>
        </MemoryProvider>
      </ProjectProvider>
    </BrainProvider>
  );
}

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Public pages — no app chrome */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/admin/waitlist" element={<AdminWaitlistPage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                <Route path="/admin/plans" element={<AdminPlansPage />} />

                {/* App routes — wrapped in sidebar layout */}
                <Route element={<AppProvidersShell />}>
                  <Route path="/app" element={<PageErrorBoundary section="Dashboard"><Dashboard /></PageErrorBoundary>} />
                  <Route path="/inbox" element={<PageErrorBoundary section="Inbox"><InboxPage /></PageErrorBoundary>} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/projects" element={<PageErrorBoundary section="Projects"><ProjectsPage /></PageErrorBoundary>} />
                  <Route path="/ai-review" element={<AIReviewPage />} />
                  <Route path="/voice" element={<VoiceCapturePage />} />
                  <Route path="/capture-gateway" element={<PageErrorBoundary section="Capture Gateway"><CaptureGatewayPage /></PageErrorBoundary>} />
                  <Route path="/review" element={<PageErrorBoundary section="Review"><ReviewRitualsPage /></PageErrorBoundary>} />
                  <Route path="/memory" element={<MemoryPage />} />
                  <Route path="/ideas" element={<IdeasVaultPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/upgrade" element={<UpgradePage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
