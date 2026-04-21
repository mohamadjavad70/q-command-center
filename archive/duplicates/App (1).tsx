import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppErrorBoundary } from "@/lib/AppErrorBoundary";
import Index from "./pages/Index";
import SamArman from "./pages/SamArman";
import QCore from "./pages/QCore";
import QAnalytics from "./pages/QAnalytics";
import NotFound from "./pages/NotFound";
import SovereignPage from "./pages/SovereignPage";
import QNetwork from "./pages/QNetwork";
import VoiceCommand from "./components/VoiceCommand";

const queryClient = new QueryClient();

const App = () => (
  <AppErrorBoundary moduleName="Qmetaram OS">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sam-arman" element={<SamArman />} />
            <Route path="/q-core" element={<QCore />} />
            <Route path="/q-analytics" element={<QAnalytics />} />
            <Route path="/q-network" element={<QNetwork />} />
            <Route path="/*" element={<SovereignPage />} />
          </Routes>
          {/* Global Voice Command FAB */}
          <VoiceCommand />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
