import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrainProvider } from "@/context/BrainContext";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrainProvider>
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
              <Route path="/ideas" element={<IdeasVaultPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </BrainProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
