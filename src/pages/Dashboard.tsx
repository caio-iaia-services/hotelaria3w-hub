import {
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  Check,
  User,
  Package,
  Phone,
  Mail,
  Sparkles,
  ArrowUpRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const kpis = [
  {
    title: "Vendas Hoje",
    value: "R$ 47.850",
    change: "↑ 12%",
    comparison: "vs ontem",
    icon: TrendingUp,
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    title: "Pedidos Pendentes",
    value: "23",
    change: "↑ 5%",
    comparison: "vs semana passada",
    icon: Clock,
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Clientes Ativos",
    value: "1.247",
    change: "↑ 8%",
    comparison: "vs mês passado",
    icon: Users,
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Ticket Médio",
    value: "R$ 3.420",
    change: "↑ 3%",
    comparison: "vs média",
    icon: DollarSign,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-50",
    iconColor: "text-accent",
  },
];

const pieData = [
  { name: "Enxovais e Uniformes", value: 32, color: "hsl(224, 64%, 33%)" },
  { name: "Amenidades", value: 24, color: "hsl(152, 60%, 40%)" },
  { name: "Restaurante e Cozinha", value: 18, color: "hsl(25, 90%, 55%)" },
  { name: "Móveis e Decoração", value: 15, color: "hsl(270, 55%, 55%)" },
  { name: "Outras", value: 11, color: "hsl(215, 16%, 65%)" },
];

const lineData = [
  { day: "Seg", vendas: 32400 },
  { day: "Ter", vendas: 28900 },
  { day: "Qua", vendas: 35200 },
  { day: "Qui", vendas: 39800 },
  { day: "Sex", vendas: 42100 },
  { day: "Sáb", vendas: 45600 },
  { day: "Dom", vendas: 47850 },
];

const activities = [
  { icon: Check, color: "text-emerald-600", bg: "bg-emerald-100", text: "Orçamento aprovado - Hotel Paradise", detail: "R$ 12.500", time: "há 15 min" },
  { icon: User, color: "text-blue-600", bg: "bg-blue-100", text: "Novo cliente - Pousada das Flores", detail: "", time: "há 32 min" },
  { icon: Package, color: "text-orange-600", bg: "bg-orange-100", text: "Pedido enviado - Hospital São Lucas", detail: "", time: "há 1h" },
  { icon: Phone, color: "text-purple-600", bg: "bg-purple-100", text: "Atendimento finalizado - Restaurante Gourmet", detail: "", time: "há 2h" },
  { icon: Mail, color: "text-gray-500", bg: "bg-gray-100", text: "E-mail enviado - Campanha Enxovais", detail: "", time: "há 3h" },
];

const topCategories = [
  { name: "Enxovais e Uniformes", pct: 32, value: "R$ 156.800", color: "hsl(224, 64%, 33%)" },
  { name: "Amenidades e Brindes", pct: 24, value: "R$ 117.600", color: "hsl(152, 60%, 40%)" },
  { name: "Restaurante e Cozinha", pct: 18, value: "R$ 88.200", color: "hsl(25, 90%, 55%)" },
  { name: "Móveis e Decoração", pct: 15, value: "R$ 73.500", color: "hsl(270, 55%, 55%)" },
  { name: "Outras Categorias", pct: 11, value: "R$ 53.900", color: "hsl(215, 16%, 65%)" },
];

const formatCurrency = (value: number) => `R$ ${(value / 1000).toFixed(1)}k`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-bold text-foreground">
          R$ {payload[0].value.toLocaleString("pt-BR")}
        </p>
      </div>
    );
  }
  return null;
};

const PieLegend = ({ data }: { data: typeof pieData }) => (
  <div className="flex flex-col gap-2.5 justify-center">
    {data.map((entry) => (
      <div key={entry.name} className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
        <span className="text-xs text-muted-foreground">{entry.name}</span>
        <span className="text-xs font-semibold text-foreground ml-auto">{entry.value}%</span>
      </div>
    ))}
  </div>
);

export default function Dashboard() {
  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do negócio</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <CalendarDays size={13} />
            Últimos 30 dias
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw size={11} />
            12/02/2026 14:30
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                  <p className="text-2xl font-heading font-bold text-foreground">{kpi.value}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className={`text-[11px] px-1.5 py-0 font-semibold ${kpi.badgeColor}`}>
                      {kpi.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{kpi.comparison}</span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                  <kpi.icon size={20} className={kpi.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-[200px] h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, ""]}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <PieLegend data={pieData} />
            </div>
          </CardContent>
        </Card>

        {/* Line/Area Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Tendência de Vendas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="vendaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(224, 64%, 33%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(224, 64%, 33%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(224, 64%, 33%)"
                    strokeWidth={2.5}
                    fill="url(#vendaGradient)"
                    dot={{ r: 4, fill: "hsl(224, 64%, 33%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities + AI Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                <div className={`p-1.5 rounded-lg ${a.bg} mt-0.5`}>
                  <a.icon size={14} className={a.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {a.text}
                    {a.detail && <span className="font-semibold"> — {a.detail}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Agent */}
        <Card className="border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-card to-purple-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <Sparkles size={16} className="text-white" />
              </div>
              <CardTitle className="font-heading text-base">
                Agente IA — Assistente Inteligente
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-card/80 backdrop-blur border border-border/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-600" />
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px]">
                  Oportunidade
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                📊 As vendas de Enxovais cresceram <span className="font-semibold">15% este mês</span>. Recomendo criar uma campanha focada em hotéis de médio porte, que representam <span className="font-semibold">60% das compras</span> desta categoria.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">Ver Análise Completa</Button>
              <Button size="sm" variant="outline" className="flex-1">Fazer Pergunta</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">Top Categorias do Mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topCategories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{cat.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">{cat.pct}%</span>
                  <span className="text-xs text-muted-foreground w-24 text-right">{cat.value}</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
