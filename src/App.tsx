import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import GA4RouteTracker from "@/components/analytics/GA4RouteTracker";
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
import AppErrorBoundary from "@/components/system/AppErrorBoundary";
import PageErrorBoundary from "@/components/system/PageErrorBoundary";

// Route-level code splitting — each page loads only when first visited.
// Core app routes (Dashboard, Inbox, Today) still load fast; heavy pages
// (Admin, Voice, Memory, Review) are deferred until needed.
const LandingPage          = lazy(() => import("@/pages/LandingPage"));
const Dashboard            = lazy(() => import("@/pages/Dashboard"));
const InboxPage            = lazy(() => import("@/pages/InboxPage"));
const TodayPage            = lazy(() => import("@/pages/TodayPage"));
const ProjectsPage         = lazy(() => import("@/pages/ProjectsPage"));
const AIReviewPage         = lazy(() => import("@/pages/AIReviewPage"));
const VoiceCapturePage     = lazy(() => import("@/pages/VoiceCapturePage"));
const IdeasVaultPage       = lazy(() => import("@/pages/IdeasVaultPage"));
const CaptureGatewayPage   = lazy(() => import("@/pages/CaptureGatewayPage"));
const ReviewRitualsPage    = lazy(() => import("@/pages/ReviewRitualsPage"));
const MemoryPage           = lazy(() => import("@/pages/MemoryPage"));
const AuthPage             = lazy(() => import("@/pages/AuthPage"));
const TermsPage            = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage          = lazy(() => import("@/pages/PrivacyPage"));
const SettingsPage         = lazy(() => import("@/pages/SettingsPage"));
const UpgradePage          = lazy(() => import("@/pages/UpgradePage"));
const WaitlistPage         = lazy(() => import("@/pages/WaitlistPage"));
const AdminWaitlistPage    = lazy(() => import("@/pages/AdminWaitlistPage"));
const AdminAnalyticsPage   = lazy(() => import("@/pages/AdminAnalyticsPage"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/AdminAnnouncementsPage"));
const InvitePage           = lazy(() => import("@/pages/InvitePage"));
const ShareTargetPage      = lazy(() => import("@/pages/ShareTargetPage"));
const SomedayPage          = lazy(() => import("@/pages/SomedayPage"));
const AdminPlansPage       = lazy(() => import("@/pages/AdminPlansPage"));
const ResetPasswordPage    = lazy(() => import("@/pages/ResetPasswordPage"));
const HelpPage             = lazy(() => import("@/pages/HelpPage"));
const WhatsNewPage         = lazy(() => import("@/pages/WhatsNewPage"));
const LearnIndexPage       = lazy(() => import("@/pages/LearnIndexPage"));
const LearnDetailPage      = lazy(() => import("@/pages/LearnDetailPage"));
const NotFound             = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

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
              <GA4RouteTracker />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public pages — no app chrome */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/share-target" element={<ShareTargetPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/learn" element={<LearnIndexPage />} />
                <Route path="/learn/:slug" element={<LearnDetailPage />} />
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
                  <Route path="/someday" element={<SomedayPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<PageErrorBoundary section="Help"><HelpPage /></PageErrorBoundary>} />
                  <Route path="/whats-new" element={<PageErrorBoundary section="What's New"><WhatsNewPage /></PageErrorBoundary>} />
                  <Route path="/upgrade" element={<UpgradePage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
