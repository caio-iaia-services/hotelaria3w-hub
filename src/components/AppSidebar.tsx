import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Headphones,
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

const menuItems: MenuItem[] = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Atendimento", url: "/atendimento", icon: Headphones },
  {
    title: "CRM",
    url: "/crm",
    icon: Target,
    submenu: [
      { title: "Enxovais e Uniformes", url: "/crm/enxovais" },
      { title: "Amenidades e Brindes", url: "/crm/amenidades" },
      { title: "Restaurante e Cozinha", url: "/crm/restaurante" },
      { title: "Móveis e Decoração", url: "/crm/moveis" },
      { title: "Outras categorias", url: "/crm/outras" },
    ],
  },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    submenu: [
      { title: "Todos", url: "/clientes" },
      { title: "Hotelaria", url: "/clientes/hotelaria" },
      { title: "Gastronomia", url: "/clientes/gastronomia" },
      { title: "Hospitalar", url: "/clientes/hospitalar" },
    ],
  },
  { title: "Fornecedores", url: "/fornecedores", icon: Building2 },
  { title: "Buscar Clientes", url: "/buscar", icon: Search },
  { title: "Marketing", url: "/marketing", icon: Mail },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Admin", url: "/admin", icon: Settings },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Clientes", "CRM"]);

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (url: string) => location.pathname === url;
  const isParentActive = (item: MenuItem) =>
    item.submenu?.some((sub) => location.pathname === sub.url) || location.pathname === item.url;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[280px] sidebar-gradient flex flex-col transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold gold-text tracking-tight">
                3W
              </h1>
              <p className="text-sidebar-foreground text-sm font-heading font-semibold -mt-1">
                Hotelaria
              </p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sidebar-foreground/60 text-xs mt-1 italic">
            Hospitalidade com Excelência
          </p>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      "text-sidebar-foreground/90 hover:sidebar-item-hover",
                      isParentActive(item)
                        ? "sidebar-item-active text-sidebar-foreground"
                        : "hover:bg-[hsla(43,72%,52%,0.1)]"
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
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                            isActive(sub.url)
                              ? "sidebar-item-active text-sidebar-foreground"
                              : "hover:bg-[hsla(43,72%,52%,0.1)]"
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-sidebar-foreground/90",
                    isActive(item.url)
                      ? "sidebar-item-active text-sidebar-foreground"
                      : "hover:bg-[hsla(43,72%,52%,0.1)]"
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-sidebar-foreground/10" />

        {/* Footer */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsla(43,72%,52%,0.1)] transition-colors">
                <Avatar className="h-9 w-9 border-2 border-gold/30">
                  <AvatarFallback className="bg-gold/20 text-sidebar-foreground font-heading text-sm font-bold">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    Administrador
                  </p>
                  <p className="text-xs text-sidebar-foreground/50">admin@3w.com</p>
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
              <DropdownMenuItem className="cursor-pointer text-destructive">
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
