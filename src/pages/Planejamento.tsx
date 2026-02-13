import { BarChart3, Target, TrendingUp, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  {
    title: "Metas do Mês",
    description: "Acompanhe o progresso das metas comerciais e operacionais",
    icon: Target,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600",
  },
  {
    title: "Previsão de Vendas",
    description: "Projeções baseadas em dados históricos e tendências do mercado",
    icon: LineChart,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
  },
  {
    title: "Análise de Performance",
    description: "Indicadores de desempenho por equipe, região e categoria",
    icon: TrendingUp,
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600",
  },
];

export default function Planejamento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Planejamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Metas, estratégias e análises</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <card.icon size={20} className={card.iconColor} />
                </div>
                <CardTitle className="font-heading text-base">{card.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
              <p className="text-xs text-muted-foreground/60 mt-4 italic">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
