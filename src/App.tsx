import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Planejamento from "./pages/Planejamento";
import Oportunidades from "./pages/Oportunidades";
import CrmGestao from "./pages/CrmGestao";
import AcoesComerciais from "./pages/AcoesComerciais";
import PlaceholderPage from "./pages/PlaceholderPage";
import Fornecedores from "./pages/Fornecedores";
import Orcamentos from "./pages/Orcamentos";
import ConfiguracoesEmail from "./pages/ConfiguracoesEmail";
import AdminUsuarios from "./pages/AdminUsuarios";
import Atendimento from "./pages/Atendimento";
import Marketing from "./pages/Marketing";
import AdminMarketing from "./pages/AdminMarketing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/clientes" element={<Protected><Clientes /></Protected>} />
              <Route path="/oportunidades" element={<Protected><Oportunidades /></Protected>} />
              <Route path="/planejamento" element={<Protected><Planejamento /></Protected>} />
              <Route path="/crm/:gestaoId" element={<Protected><CrmGestao /></Protected>} />
              <Route path="/acoes-comerciais" element={<Protected><AcoesComerciais /></Protected>} />
              <Route path="/fornecedores" element={<Protected><Fornecedores /></Protected>} />
              <Route path="/orcamentos" element={<Protected><Orcamentos /></Protected>} />
              <Route path="/admin/email" element={<Protected><ConfiguracoesEmail /></Protected>} />
              <Route path="/admin/usuarios" element={<Protected><AdminUsuarios /></Protected>} />
              <Route path="/atendimento" element={<Protected><Atendimento /></Protected>} />
              <Route path="/marketing" element={<Protected><Marketing /></Protected>} />
              <Route path="/admin/marketing" element={<Protected><AdminMarketing /></Protected>} />
              {[
                "/crm", "/clientes/hotelaria", "/clientes/gastronomia",
                "/clientes/hospitalar", "/buscar", "/financeiro", "/admin",
              ].map((path) => (
                <Route key={path} path={path} element={<Protected><PlaceholderPage /></Protected>} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
