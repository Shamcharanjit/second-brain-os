import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { BrainProvider } from "@/context/BrainContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { MemoryProvider } from "@/context/MemoryContext";
import { ReviewMetaProvider } from "@/context/ReviewMetaContext";
import AppLayout from "@/components/AppLayout";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrainProvider>
          <ProjectProvider>
            <MemoryProvider>
              <ReviewMetaProvider>
                <BrowserRouter>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
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
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </BrowserRouter>
              </ReviewMetaProvider>
            </MemoryProvider>
          </ProjectProvider>
        </BrainProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
