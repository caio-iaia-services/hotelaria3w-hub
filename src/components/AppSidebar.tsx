import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import {
  Home,
  Target,
  FileText,
  Users,
  Building2,
  Search,
  Mail,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  X,
  BarChart3,
  Zap,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WhatsAppIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { gestaoLabel, gestaoUrlParam, GESTOES } from "@/lib/userProfile";

interface SubItem {
  title: string;
  url: string;
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  modulo: string;
  submenu?: SubItem[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, perfil, isAdmin, gestaoFiltro, temModulo } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Submenu do CRM: admin vê todas as gestões, comercial só a sua
  const crmSubmenu: SubItem[] = isAdmin
    ? GESTOES.map(g => ({ title: gestaoLabel[g], url: `/crm/${gestaoUrlParam[g]}` }))
    : gestaoFiltro
      ? [{ title: gestaoLabel[gestaoFiltro], url: `/crm/${gestaoUrlParam[gestaoFiltro]}` }]
      : GESTOES.map(g => ({ title: gestaoLabel[g], url: `/crm/${gestaoUrlParam[g]}` }))

  const menuSections: MenuSection[] = [
    {
      label: "",
      items: [
        { title: "Home", url: "/dashboard", icon: BarChart3, modulo: "dashboard" },
      ],
    },
    {
      label: "VENDAS",
      items: [
        { title: "Oportunidades", url: "/oportunidades", icon: Target, modulo: "oportunidades" },
        { title: "CRM", url: "/crm", icon: BarChart3, modulo: "crm", submenu: crmSubmenu },
        { title: "Orçamentos", url: "/orcamentos", icon: FileText, modulo: "orcamentos" },
        { title: "Ações Comerciais", url: "/acoes-comerciais", icon: Zap, modulo: "acoes_comerciais" },
        { title: "Clientes", url: "/clientes", icon: Users, modulo: "clientes" },
      ],
    },
    {
      label: "OPERAÇÕES",
      items: [
        { title: "Atendimento", url: "/atendimento", icon: WhatsAppIcon, modulo: "atendimento" },
        { title: "Fornecedores", url: "/fornecedores", icon: Building2, modulo: "fornecedores" },
      ],
    },
    {
      label: "GESTÃO",
      items: [
        { title: "Marketing", url: "/marketing", icon: Mail, modulo: "marketing" },
        { title: "Financeiro", url: "/financeiro", icon: DollarSign, modulo: "financeiro" },
        { title: "Planejamento", url: "/planejamento", icon: BarChart3, modulo: "planejamento" },
      ],
    },
    {
      label: "FERRAMENTAS",
      items: [
        { title: "Buscar Empresas", url: "/buscar", icon: Search, modulo: "admin" },
      ],
    },
  ];

  const adminItems: MenuItem[] = [
    {
      title: "Admin",
      url: "/admin",
      icon: Settings,
      modulo: "admin",
      submenu: [
        ...(temModulo("admin_usuarios") ? [{ title: "Usuários", url: "/admin/usuarios" }] : []),
        { title: "Configurações E-mail", url: "/admin/email" },
      ],
    },
  ];

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => prev.includes(title) ? [] : [title]);
  };

  const isActive = (url: string) => location.pathname === url;
  const isParentActive = (item: MenuItem) =>
    item.submenu?.some((sub) => location.pathname === sub.url) || location.pathname === item.url;

  const renderItem = (item: MenuItem) => {
    if (!temModulo(item.modulo)) return null;

    return (
      <div key={item.title}>
        {item.submenu ? (
          <>
            <button
              onClick={() => toggleSubmenu(item.title)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200",
                "text-sidebar-foreground/90",
                isParentActive(item)
                  ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                  : "hover:bg-[rgba(255,255,255,0.1)]"
              )}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1 text-left">{item.title}</span>
              {expandedMenus.includes(item.title) ? (
                <ChevronDown size={14} className="text-sidebar-foreground/60" />
              ) : (
                <ChevronRight size={14} className="text-sidebar-foreground/60" />
              )}
            </button>
            {expandedMenus.includes(item.title) && (
              <div className="ml-5 mt-0.5 space-y-0.5 animate-submenu-open">
                {item.submenu.map((sub) => (
                  <Link
                    key={sub.url}
                    to={sub.url}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                      isActive(sub.url)
                        ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                        : "hover:bg-[rgba(255,255,255,0.1)]"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", isActive(sub.url) ? "bg-gold" : "bg-sidebar-foreground/30")} />
                    {sub.title}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <Link
            to={item.url}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200",
              "text-sidebar-foreground/90",
              isActive(item.url)
                ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                : "hover:bg-[rgba(255,255,255,0.1)]"
            )}
          >
            <item.icon size={16} className="shrink-0" />
            <span>{item.title}</span>
          </Link>
        )}
      </div>
    );
  };

  const iniciais = perfil?.nome
    ? perfil.nome.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[280px] bg-sidebar flex flex-col transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="px-4 py-1 flex items-center justify-between">
          <img src="/logo_3Whotelaria_transp.png" alt="3W Hotelaria" className="h-[40px] w-auto" />
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Menu */}
        <nav className="flex-1 py-1 px-3 overflow-y-auto">
          {menuSections.map((section, idx) => {
            const itemsVisiveis = section.items.filter(item => temModulo(item.modulo));
            if (itemsVisiveis.length === 0) return null;
            return (
              <div key={section.label || idx} className={cn(idx > 0 && "mt-1")}>
                {section.label && (
                  <p className="px-3 mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0">
                  {section.items.map(renderItem)}
                </div>
              </div>
            );
          })}

          {/* Admin */}
          {temModulo("admin") && (
            <>
              <div className="mx-1 my-1 h-px bg-sidebar-foreground/20" />
              {adminItems.map(renderItem)}
            </>
          )}
        </nav>

        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Footer com usuário */}
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <Avatar className="h-8 w-8 border-2 border-gold/30">
                  <AvatarFallback className="bg-gold/20 text-sidebar-foreground font-heading text-xs font-bold">
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {perfil?.nome || "Usuário"}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/50 truncate">
                    {perfil?.email || ""}
                  </p>
                </div>
                <ChevronDown size={14} className="text-sidebar-foreground/50 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 bg-card z-50">
              {temModulo("admin_usuarios") && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate("/admin/usuarios"); onClose(); }}>
                  <UserCog size={14} className="mr-2" />
                  Gerenciar Usuários
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer">
                <User size={14} className="mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive"
                onClick={async () => { await signOut(); navigate('/'); }}
              >
                <LogOut size={14} className="mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
