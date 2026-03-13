import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import {
  Home,
  Headphones,
  Target,
  FileText,
  Users,
  Building2,
  Search,
  Mail,
  DollarSign,
  Settings,
  Mail as MailIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  X,
  BarChart3,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SubItem {
  title: string;
  url: string;
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  submenu?: SubItem[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    label: "",
    items: [
      { title: "Home", url: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    label: "VENDAS",
    items: [
      { title: "Oportunidades", url: "/oportunidades", icon: Target },
      {
        title: "CRM",
        url: "/crm",
        icon: BarChart3,
        submenu: [
          { title: "Gestão 1", url: "/crm/gestao-1" },
          { title: "Gestão 2", url: "/crm/gestao-2" },
          { title: "Gestão 3", url: "/crm/gestao-3" },
        ],
      },
      { title: "Orçamentos", url: "/orcamentos", icon: FileText },
      { title: "Ações Comerciais", url: "/acoes-comerciais", icon: Zap },
      { title: "Clientes", url: "/clientes", icon: Users },
    ],
  },
  {
    label: "OPERAÇÕES",
    items: [
      { title: "Atendimento", url: "/atendimento", icon: Headphones },
      { title: "Fornecedores", url: "/fornecedores", icon: Building2 },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { title: "Marketing", url: "/marketing", icon: Mail },
      { title: "Financeiro", url: "/financeiro", icon: DollarSign },
      { title: "Planejamento", url: "/planejamento", icon: BarChart3 },
    ],
  },
  {
    label: "FERRAMENTAS",
    items: [
      { title: "Buscar Empresas", url: "/buscar", icon: Search },
    ],
  },
  {
    label: "CONFIGURAÇÕES",
    items: [
      { title: "E-mail", url: "/configuracoes/email", icon: MailIcon },
    ],
  },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title) ? [] : [title]
    );
  };

  const isActive = (url: string) => location.pathname === url;
  const isParentActive = (item: MenuItem) =>
    item.submenu?.some((sub) => location.pathname === sub.url) || location.pathname === item.url;

  const renderItem = (item: MenuItem) => (
    <div key={item.title}>
      {item.submenu ? (
        <>
          <button
            onClick={() => toggleSubmenu(item.title)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              "text-sidebar-foreground/90",
              isParentActive(item)
                ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                : "hover:bg-[rgba(255,255,255,0.1)]"
            )}
          >
            <item.icon size={18} className="shrink-0" />
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
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    isActive(sub.url)
                      ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                      : "hover:bg-[rgba(255,255,255,0.1)]"
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isActive(sub.url)
                        ? "bg-gold"
                        : "bg-sidebar-foreground/30"
                    )}
                  />
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
            "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            "text-sidebar-foreground/90",
            isActive(item.url)
              ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
              : "hover:bg-[rgba(255,255,255,0.1)]"
          )}
        >
          <item.icon size={18} className="shrink-0" />
          <span>{item.title}</span>
        </Link>
      )}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[280px] bg-sidebar flex flex-col transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with Logo */}
        <div className="px-4 py-2 flex items-center justify-between">
          <img
            src="/logo_3Whotelaria_transp.png"
            alt="3W Hotelaria"
            className="h-[48px] w-auto"
          />
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Menu - no scroll */}
        <nav className="flex-1 py-2 px-3">
          {menuSections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && "mt-2")}>
              {section.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </p>
              )}
              <div className="space-y-0">
                {section.items.map(renderItem)}
              </div>
            </div>
          ))}

          {/* Separator */}
          <div className="mx-1 my-2 h-px bg-sidebar-foreground/20" />

          {/* Admin */}
          <Link
            to="/admin"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              "text-sidebar-foreground/90",
              isActive("/admin")
                ? "border-l-[3px] border-gold bg-[rgba(212,175,55,0.15)] text-sidebar-foreground"
                : "hover:bg-[rgba(255,255,255,0.1)]"
            )}
          >
            <Settings size={18} className="shrink-0" />
            <span>Admin</span>
          </Link>
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Footer */}
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <Avatar className="h-8 w-8 border-2 border-gold/30">
                  <AvatarFallback className="bg-gold/20 text-sidebar-foreground font-heading text-xs font-bold">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    Administrador
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/50">admin@3w.com</p>
                </div>
                <ChevronDown size={14} className="text-sidebar-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-56 bg-card z-50"
            >
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
