import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SubscriptionProvider>
        <BrainProvider>
          <ProjectProvider>
            <MemoryProvider>
              <ReviewMetaProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public pages — no app chrome */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/waitlist" element={<WaitlistPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* App routes — wrapped in sidebar layout */}
                    <Route element={<AppShell />}>
                      <Route path="/app" element={<Dashboard />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/today" element={<TodayPage />} />
                      <Route path="/projects" element={<ProjectsPage />} />
                      <Route path="/ai-review" element={<AIReviewPage />} />
                      <Route path="/voice" element={<VoiceCapturePage />} />
                      <Route path="/capture-gateway" element={<CaptureGatewayPage />} />
                      <Route path="/review" element={<ReviewRitualsPage />} />
                      <Route path="/memory" element={<MemoryPage />} />
                      <Route path="/ideas" element={<IdeasVaultPage />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/upgrade" element={<UpgradePage />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ReviewMetaProvider>
            </MemoryProvider>
          </ProjectProvider>
        </BrainProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
