import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Admin from "./pages/Admin";
import CommandCenter from "./pages/CommandCenter";
import SocialPage from "./pages/SocialPage";
import IVRPage from "./pages/IVRPage";
import SatellitePage from "./pages/SatellitePage";
import AlertsPage from "./pages/AlertsPage";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";

const queryClient = new QueryClient();

/** Show Navbar on all pages except the Admin landing */
const LayoutShell = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const hideNavbar = pathname === "/admin";
  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LayoutShell>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/ivr" element={<IVRPage />} />
            <Route path="/satellite" element={<SatellitePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LayoutShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
