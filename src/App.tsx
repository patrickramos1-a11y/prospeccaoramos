import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Municipios from "./pages/Municipios";
import Visitas from "./pages/Visitas";
import OrgaosHub from "./pages/OrgaosHub";
import { Navigate } from "react-router-dom";
import Estoque from "./pages/Estoque";
import Kits from "./pages/Kits";
import Inteligencia from "./pages/Inteligencia";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import { connectCentralLive, publishCentralLiveContext, publishCentralLiveNavigation } from "./lib/centralLiveBridge";

const queryClient = new QueryClient();

const SHARED_QUERY_KEYS = new Set(["view", "tab", "page", "filter", "q", "project", "step", "client", "section"]);

function safeRoute(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  for (const key of [...params.keys()]) if (!SHARED_QUERY_KEYS.has(key.toLowerCase())) params.delete(key);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function LiveRouteBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => connectCentralLive((context) => {
    if (typeof context.view !== "string" || !context.view.startsWith("/") || context.view.startsWith("//")) return;
    try {
      const target = new URL(context.view, window.location.origin);
      if (target.origin === window.location.origin) navigateRef.current(safeRoute(target.pathname, target.search));
    } catch {
      // Ignore an invalid route received from the host.
    }
  }), []);

  useEffect(() => {
    const view = safeRoute(location.pathname, location.search);
    publishCentralLiveContext({ view });
    publishCentralLiveNavigation();
  }, [location.pathname, location.search]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LiveRouteBridge />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/municipios" element={<Municipios />} />
            <Route path="/visitas" element={<Visitas />} />
            <Route path="/orgaos" element={<OrgaosHub />} />
            <Route path="/contatos" element={<Navigate to="/orgaos?tab=contatos" replace />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/kits" element={<Kits />} />
            <Route path="/inteligencia" element={<Inteligencia />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
