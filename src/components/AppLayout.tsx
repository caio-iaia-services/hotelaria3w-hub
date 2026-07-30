import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, Sun, Moon, Trash2, CheckCircle2 } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { useSolicitacoesPendentes } from "@/hooks/useSolicitacoesPendentes";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/atendimento": "Atendimento",
  "/crm": "CRM",
  "/crm/gestao-1": "CRM - Gestão 1",
  "/crm/gestao-2": "CRM - Gestão 2",
  "/crm/gestao-3": "CRM - Gestão 3",
  "/crm/gestao-4": "CRM - Gestão 4",
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
  "/rh": "RH",
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
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { perfil } = useAuth();
  const solicitacoes = useSolicitacoesPendentes(perfil?.id);

  const iniciais = perfil?.nome
    ? perfil.nome.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : perfil?.email?.slice(0, 2).toUpperCase() ?? "??";

  const nomeExibido = perfil?.nome
    ? perfil.nome.split(" ").slice(0, 2).join(" ")
    : perfil?.email ?? "Usuário";

  const pageTitle = pageTitles[location.pathname] || "3W Hotelaria";

  return (
    <div className="flex h-screen overflow-hidden w-full bg-background">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 h-16 shrink-0 bg-[#c4942c] border-b border-[#c4942c] flex items-center justify-between px-4 lg:px-8 shadow-sm">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
                  <Bell size={18} />
                  {solicitacoes.total > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                      {solicitacoes.total}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold">Solicitações pendentes</p>
                </div>
                {solicitacoes.itens.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma solicitação pendente.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {solicitacoes.itens.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate("/agenda")}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {item.tipo === "exclusao" ? (
                            <Trash2 size={12} className="text-destructive" />
                          ) : (
                            <CheckCircle2 size={12} className="text-emerald-600" />
                          )}
                          {item.tipo === "exclusao" ? "Pedido de exclusão" : "Pedido de conclusão"}
                        </div>
                        <p className="text-xs mt-0.5 truncate">{item.tarefaTitulo}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {item.solicitanteNome && <span className="font-medium">{item.solicitanteNome}: </span>}
                          {item.motivo}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-3 py-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => navigate("/agenda")}>
                    Ver na Agenda
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1a4168] text-white font-heading text-xs font-bold">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white">
                {nomeExibido}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
