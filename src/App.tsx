import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<AppLayout><Dashboard /></AppLayout>}
          />
          <Route
            path="/clientes"
            element={<AppLayout><Clientes /></AppLayout>}
          />
          {[
            "/atendimento",
            "/crm",
            "/crm/enxovais",
            "/crm/amenidades",
            "/crm/restaurante",
            "/crm/moveis",
            "/crm/outras",
            "/orcamentos",
            "/clientes/hotelaria",
            "/clientes/gastronomia",
            "/clientes/hospitalar",
            "/fornecedores",
            "/buscar",
            "/marketing",
            "/financeiro",
            "/admin",
          ].map((path) => (
            <Route
              key={path}
              path={path}
              element={<AppLayout><PlaceholderPage /></AppLayout>}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
