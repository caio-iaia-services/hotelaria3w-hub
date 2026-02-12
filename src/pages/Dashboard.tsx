import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Headphones,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Clientes Ativos",
    value: "1.248",
    change: "+12%",
    up: true,
    icon: Users,
  },
  {
    title: "Orçamentos",
    value: "384",
    change: "+8%",
    up: true,
    icon: FileText,
  },
  {
    title: "Receita Mensal",
    value: "R$ 284.5k",
    change: "+23%",
    up: true,
    icon: DollarSign,
  },
  {
    title: "Fornecedores",
    value: "67",
    change: "-2%",
    up: false,
    icon: Building2,
  },
];

const recentActivities = [
  { text: "Novo orçamento enviado para Hotel Fasano", time: "2 min atrás", icon: FileText },
  { text: "Cliente Marriott atualizado no CRM", time: "15 min atrás", icon: Users },
  { text: "Atendimento #4521 finalizado", time: "1h atrás", icon: Headphones },
  { text: "Fornecedor Tramontina cadastrado", time: "2h atrás", icon: Building2 },
  { text: "Meta de vendas de janeiro atingida", time: "3h atrás", icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-heading font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.up ? (
                      <ArrowUpRight size={14} className="text-green-600" />
                    ) : (
                      <ArrowDownRight size={14} className="text-destructive" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        stat.up ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs mês anterior</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <stat.icon size={20} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {recentActivities.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
              >
                <div className="p-1.5 rounded-lg bg-accent/10 mt-0.5">
                  <activity.icon size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">
              Resumo por Segmento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Hotelaria", value: 62, count: 774 },
                { label: "Gastronomia", value: 24, count: 299 },
                { label: "Hospitalar", value: 14, count: 175 },
              ].map((segment) => (
                <div key={segment.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">
                      {segment.label}
                    </span>
                    <span className="text-muted-foreground">
                      {segment.count} clientes ({segment.value}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${segment.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
