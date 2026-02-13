import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Planejamento from "./pages/Planejamento";
import CrmGestao from "./pages/CrmGestao";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/dashboard"
              element={<AppLayout><Dashboard /></AppLayout>}
            />
            <Route
              path="/clientes"
              element={<AppLayout><Clientes /></AppLayout>}
            />
            <Route
              path="/planejamento"
              element={<AppLayout><Planejamento /></AppLayout>}
            />
            <Route
              path="/crm/:gestaoId"
              element={<AppLayout><CrmGestao /></AppLayout>}
            />
            {[
              "/atendimento",
              "/crm",
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
