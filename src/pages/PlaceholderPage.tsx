import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/atendimento": "Atendimento",
  "/crm": "CRM",
  "/crm/enxovais": "Enxovais e Uniformes",
  "/crm/amenidades": "Amenidades e Brindes",
  "/crm/restaurante": "Restaurante e Cozinha",
  "/crm/moveis": "Móveis e Decoração",
  "/crm/outras": "Outras Categorias",
  "/orcamentos": "Orçamentos",
  "/clientes/hotelaria": "Clientes - Hotelaria",
  "/clientes/gastronomia": "Clientes - Gastronomia",
  "/clientes/hospitalar": "Clientes - Hospitalar",
  "/fornecedores": "Fornecedores",
  "/buscar": "Buscar Empresas",
  "/marketing": "Marketing",
  "/financeiro": "Financeiro",
  "/admin": "Administração",
};

export default function PlaceholderPage() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Página";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-2xl bg-primary/10 mb-4">
        <Construction size={40} className="text-primary" />
      </div>
      <h2 className="text-xl font-heading font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        Esta seção está em desenvolvimento. Em breve você terá acesso completo a todas as funcionalidades.
      </p>
    </div>
  );
}
