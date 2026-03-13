import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, Bell, Sun, Moon } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/atendimento": "Atendimento",
  "/crm": "CRM",
  "/crm/gestao-1": "CRM - Gestão 1",
  "/crm/gestao-2": "CRM - Gestão 2",
  "/crm/gestao-3": "CRM - Gestão 3",
  "/crm/outras": "Outras Categorias",
  "/oportunidades": "Oportunidades",
  "/orcamentos": "Orçamentos",
  "/clientes": "Clientes",
  "/clientes/hotelaria": "Clientes - Hotelaria",
  "/clientes/gastronomia": "Clientes - Gastronomia",
  "/clientes/hospitalar": "Clientes - Hospitalar",
  "/fornecedores": "Fornecedores",
  "/buscar": "Buscar Empresas",
  "/marketing": "Marketing",
  "/financeiro": "Financeiro",
  "/admin": "Administração",
  "/planejamento": "Planejamento",
  "/acoes-comerciais": "Ações Comerciais",
  "/admin/email": "Admin - Configurações de E-mail",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const pageTitle = pageTitles[location.pathname] || "3W Hotelaria";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[#c4942c] border-b border-[#c4942c] flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <h2 className="text-lg font-heading font-semibold text-white">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="transition-transform duration-300 text-white hover:bg-white/10"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
            <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1a4168] text-white font-heading text-xs font-bold">
                  AD
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white">
                Administrador
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
