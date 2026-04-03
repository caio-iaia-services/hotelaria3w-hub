import { useNavigate } from "react-router-dom";
import { FileText, Target, Users, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AcoesRapidasProps {
  onNovaTarefa: () => void;
}

export function AcoesRapidas({ onNovaTarefa }: AcoesRapidasProps) {
  const navigate = useNavigate();

  const acoes = [
    {
      label: "Novo Orçamento",
      icon: FileText,
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      onClick: () => navigate("/orcamentos"),
    },
    {
      label: "Nova Oportunidade",
      icon: Target,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      onClick: () => navigate("/oportunidades"),
    },
    {
      label: "Novo Cliente",
      icon: Users,
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      onClick: () => navigate("/clientes"),
    },
    {
      label: "Nova Tarefa",
      icon: CheckSquare,
      color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      onClick: onNovaTarefa,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {acoes.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          onClick={a.onClick}
          className={`gap-2 text-xs font-medium border ${a.color} transition-colors`}
        >
          <a.icon size={13} />
          {a.label}
        </Button>
      ))}
    </div>
  );
}
