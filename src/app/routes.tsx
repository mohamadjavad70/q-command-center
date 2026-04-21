import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import QVoiceChat from "@/components/QVoiceChat";

const Index = lazy(() => import("@/pages/Index"));
const SamArman = lazy(() => import("@/pages/SamArman"));
const QCore = lazy(() => import("@/pages/QCore"));
const QAnalytics = lazy(() => import("@/pages/QAnalytics"));
const QNetwork = lazy(() => import("@/pages/QNetwork"));
const Galaxy = lazy(() => import("@/pages/Galaxy"));
const SovereignPage   = lazy(() => import("@/pages/SovereignPage"));
const QCyberCommand   = lazy(() => import("@/pages/QCyberCommand"));
const QSwissLanding     = lazy(() => import("@/pages/QSwissLanding"));
const QSwissVoiceAgent        = lazy(() => import("@/pages/QSwissVoiceAgent"));
const LearningDashboardPage  = lazy(() => import("@/pages/LearningDashboardPage"));
const QOSPage                = lazy(() => import("@/pages/QOSPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
        در حال بارگذاری ماژول...
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sam-arman" element={<SamArman />} />
          <Route path="/q-core" element={<QCore />} />
          <Route path="/q-analytics" element={<QAnalytics />} />
          <Route path="/q-network" element={<QNetwork />} />
          <Route path="/galaxy"    element={<Galaxy />} />
          <Route path="/cybermap"    element={<QCyberCommand />} />
          <Route path="/swiss"       element={<QSwissLanding />} />
          <Route path="/swiss-voice"          element={<QSwissVoiceAgent />} />
          <Route path="/learning-dashboard"   element={<LearningDashboardPage />} />
          <Route path="/qos"                  element={<QOSPage />} />
          <Route path="/*"           element={<SovereignPage />} />
        </Routes>
      </Suspense>
      <QVoiceChat />
    </BrowserRouter>
  );
}
