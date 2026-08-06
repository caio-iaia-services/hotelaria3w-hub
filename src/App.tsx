import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Páginas em lazy: cada rota vira um chunk próprio (bundle inicial menor)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Planejamento = lazy(() => import("./pages/Planejamento"));
const Oportunidades = lazy(() => import("./pages/Oportunidades"));
const CrmGestao = lazy(() => import("./pages/CrmGestao"));
const AcoesComerciais = lazy(() => import("./pages/AcoesComerciais"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const ConfiguracoesEmail = lazy(() => import("./pages/ConfiguracoesEmail"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const Atendimento = lazy(() => import("./pages/Atendimento"));
const Marketing = lazy(() => import("./pages/Marketing"));
const AdminMarketing = lazy(() => import("./pages/AdminMarketing"));
const AdminTemplatesWhatsApp = lazy(() => import("./pages/AdminTemplatesWhatsApp"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const RH = lazy(() => import("./pages/RH"));
const Inteligencia = lazy(() => import("./pages/Inteligencia"));
const Contatos = lazy(() => import("./pages/Contatos"));
const BuscarEmpresas = lazy(() => import("./pages/BuscarEmpresas"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const queryClient = new QueryClient();

function CarregandoPagina() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={<CarregandoPagina />}>{children}</Suspense>
      </AppLayout>
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
              <Route path="/privacy" element={<Suspense fallback={<CarregandoPagina />}><PrivacyPolicy /></Suspense>} />
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/agenda" element={<Protected><Agenda /></Protected>} />
              <Route path="/clientes" element={<Protected><Clientes /></Protected>} />
              <Route path="/contatos" element={<Protected><Contatos /></Protected>} />
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
              <Route path="/admin/templates-whatsapp" element={<Protected><AdminTemplatesWhatsApp /></Protected>} />
              <Route path="/financeiro" element={<Protected><Financeiro /></Protected>} />
              <Route path="/rh" element={<Protected><RH /></Protected>} />
              <Route path="/inteligencia" element={<Protected><Inteligencia /></Protected>} />
              <Route path="/buscar" element={<Protected><BuscarEmpresas /></Protected>} />
              {[
                "/crm", "/clientes/hotelaria", "/clientes/gastronomia",
                "/clientes/hospitalar", "/admin",
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
