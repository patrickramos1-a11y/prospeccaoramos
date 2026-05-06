import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Municipios from "./pages/Municipios";
import Visitas from "./pages/Visitas";
import Contatos from "./pages/Contatos";
import Orgaos from "./pages/Orgaos";
import Estoque from "./pages/Estoque";
import Kits from "./pages/Kits";
import Inteligencia from "./pages/Inteligencia";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/municipios" element={<Municipios />} />
            <Route path="/visitas" element={<Visitas />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/orgaos" element={<Orgaos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/kits" element={<Kits />} />
            <Route path="/inteligencia" element={<Inteligencia />} />
            <Route path="/financeiro" element={<Financeiro />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
