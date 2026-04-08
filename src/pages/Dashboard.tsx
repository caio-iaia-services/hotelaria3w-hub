import { useEffect, useState } from "react";
import {
  FileText, Clock, Users, DollarSign,
  CheckCircle2, Send, XCircle, Target, RefreshCw,
  CalendarDays, Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { gestaoLabel } from "@/lib/userProfile";
import { CardIA } from "@/components/dashboard/CardIA";
import { CardAlertas } from "@/components/dashboard/CardAlertas";
import { CardTarefas } from "@/components/dashboard/CardTarefas";
import { CardAgenda } from "@/components/dashboard/CardAgenda";
import { CardComissao } from "@/components/dashboard/CardComissao";

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  rascunho:  "hsl(215, 16%, 65%)",
  enviado:   "hsl(224, 64%, 33%)",
  aprovado:  "hsl(152, 60%, 40%)",
  rejeitado: "hsl(0, 72%, 55%)",
  expirado:  "hsl(25, 90%, 55%)",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho:  "Rascunho",
  enviado:   "Enviado",
  aprovado:  "Aprovado",
  rejeitado: "Rejeitado",
  expirado:  "Expirado",
};

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function formatCurrencyFull(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const labelGestao = (g: string) => {
  if (gestaoLabel[g]) return gestaoLabel[g];
  const m = g.match(/^G(\d+)$/);
  return m ? `Gestão ${m[1]}` : g;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-bold text-foreground">
          {payload[0].name === "valor"
            ? formatCurrencyFull(payload[0].value)
            : `${payload[0].value} orçamentos`}
        </p>
      </div>
    );
  }
  return null;
};

const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const GESTAO_COLORS: Record<string, string> = {
  G1: "hsl(224, 64%, 33%)",
  G2: "hsl(152, 60%, 40%)",
  G3: "hsl(25, 90%, 55%)",
  G4: "hsl(270, 55%, 55%)",
};
const gestaoColor = (g: string) => {
  if (GESTAO_COLORS[g]) return GESTAO_COLORS[g];
  // gera cor determinística para G5, G6...
  const num = parseInt(g.replace("G", "")) || 0;
  const hue = (num * 67) % 360;
  return `hsl(${hue}, 55%, 45%)`;
};

// ─── component ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { gestaoFiltro, isAdmin, perfil } = useAuth();

  // Tab selecionada pelo admin (null = Total)
  const [selectedGestaoAdmin, setSelectedGestaoAdmin] = useState<string | null>(null);
  // Gestões dinâmicas dos usuários comerciais
  const [gestoesDinamicas, setGestoesDinamicas] = useState<string[]>([]);

  // Filtro efetivo usado nas queries
  const effectiveFiltro = isAdmin ? selectedGestaoAdmin : gestaoFiltro;

  const [loading, setLoading] = useState(true);
  const [atualizado, setAtualizado] = useState(new Date());

  // KPIs
  const [totalOrcamentos, setTotalOrcamentos]       = useState(0);
  const [orcamentosPendentes, setOrcamentosPendentes] = useState(0);
  const [orcamentosAprovados, setOrcamentosAprovados] = useState(0);
  const [valorTotalAprovado, setValorTotalAprovado]   = useState(0);
  const [ticketMedio, setTicketMedio]                 = useState(0);
  const [totalClientes, setTotalClientes]             = useState(0);
  const [totalOportunidades, setTotalOportunidades]   = useState(0);

  // Charts
  const [statusData, setStatusData]     = useState<{ name: string; value: number; color: string }[]>([]);
  const [tendenciaData, setTendenciaData] = useState<{ mes: string; quantidade: number; valor: number }[]>([]);

  // Recentes / gestão
  const [recentes, setRecentes]   = useState<any[]>([]);
  const [porGestao, setPorGestao] = useState<{ gestao: string; total: number; valor: number }[]>([]);

  const [focarNovaTarefa, setFocarNovaTarefa] = useState(false);

  // ── Buscar gestões dinâmicas (admin) ──────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("user_profiles")
      .select("gestao")
      .eq("role", "comercial")
      .not("gestao", "is", null)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map((p: any) => p.gestao).filter(Boolean))].sort() as string[];
        setGestoesDinamicas(unique);
      });
  }, [isAdmin]);

  // ── Carregar métricas ─────────────────────────────────────────────────────
  const carregar = async () => {
    setLoading(true);

    const baseQuery = () => {
      let q = supabase.from("orcamentos").select("id, numero, status, total, created_at, gestao, cliente_nome, cliente_razao_social, fornecedor_nome, operacao").limit(10000);
      if (effectiveFiltro) q = (q as any).eq("gestao", effectiveFiltro);
      return q;
    };

    const { data: todos } = await baseQuery();
    const orcamentos = (todos || []) as any[];

    setTotalOrcamentos(orcamentos.length);
    const pendentes = orcamentos.filter(o => o.status === "rascunho" || o.status === "enviado");
    setOrcamentosPendentes(pendentes.length);
    const aprovados = orcamentos.filter(o => o.status === "aprovado");
    setOrcamentosAprovados(aprovados.length);
    const valorAprov = aprovados.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    setValorTotalAprovado(valorAprov);
    setTicketMedio(aprovados.length > 0 ? valorAprov / aprovados.length : 0);

    // Clientes (sem filtro de gestão)
    const { count: countClientes } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true });
    setTotalClientes(countClientes || 0);

    // Oportunidades em andamento
    let qOp = supabase.from("oportunidades").select("*", { count: "exact", head: true }).eq("status", "em_andamento");
    if (effectiveFiltro) qOp = (qOp as any).ilike("gestao", `%${effectiveFiltro}%`);
    const { count: countOp } = await qOp;
    setTotalOportunidades(countOp || 0);

    // Status pie
    const statusCount: Record<string, number> = {};
    orcamentos.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
    setStatusData(
      Object.entries(statusCount)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || "#999" }))
    );

    // Tendência últimos 6 meses
    const agora = new Date();
    const tendencia = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
      return { mes: mesesAbrev[d.getMonth()], ano: d.getFullYear(), quantidade: 0, valor: 0 };
    });
    orcamentos.forEach(o => {
      const d = new Date(o.created_at);
      const entry = tendencia.find(t => t.mes === mesesAbrev[d.getMonth()] && t.ano === d.getFullYear());
      if (entry) { entry.quantidade++; entry.valor += parseFloat(o.total) || 0; }
    });
    setTendenciaData(tendencia.map(({ mes, quantidade, valor }) => ({ mes, quantidade, valor })));

    // Recentes (últimos 5)
    setRecentes(
      [...orcamentos]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    );

    // Por gestão (somente quando admin e aba Total)
    if (isAdmin && effectiveFiltro === null) {
      // Agrupar os próprios orcamentos por gestao
      const gestaoMap: Record<string, { total: number; valor: number }> = {};
      orcamentos.forEach(o => {
        if (!o.gestao) return;
        if (!gestaoMap[o.gestao]) gestaoMap[o.gestao] = { total: 0, valor: 0 };
        gestaoMap[o.gestao].total++;
        gestaoMap[o.gestao].valor += parseFloat(o.total) || 0;
      });
      setPorGestao(
        Object.entries(gestaoMap)
          .map(([gestao, d]) => ({ gestao, ...d }))
          .sort((a, b) => a.gestao.localeCompare(b.gestao))
      );
    } else {
      setPorGestao([]);
    }

    setAtualizado(new Date());
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [selectedGestaoAdmin, gestaoFiltro]);

  // ── Helpers visuais ───────────────────────────────────────────────────────
  const statusIcon = (status: string) => {
    if (status === "aprovado")  return <CheckCircle2 size={13} className="text-emerald-600" />;
    if (status === "enviado")   return <Send size={13} className="text-blue-600" />;
    if (status === "rejeitado") return <XCircle size={13} className="text-red-500" />;
    return <FileText size={13} className="text-gray-400" />;
  };

  const statusBadgeClass: Record<string, string> = {
    rascunho:  "bg-gray-100 text-gray-600 border-gray-200",
    enviado:   "bg-blue-100 text-blue-700 border-blue-200",
    aprovado:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejeitado: "bg-red-100 text-red-700 border-red-200",
    expirado:  "bg-orange-100 text-orange-700 border-orange-200",
  };

  const maxGestaoValor = Math.max(...porGestao.map(g => g.valor), 1);

  // Título da aba/filtro atual
  const tituloFiltro = effectiveFiltro ? labelGestao(effectiveFiltro) : "Visão geral do negócio";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 bg-[#dbdbdb] min-h-screen p-6 -m-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tituloFiltro}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <CalendarDays size={13} />
            Todos os períodos
          </Badge>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={carregar} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            {atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Button>
        </div>
      </div>

      {/* ── Abas de gestão (admin) ── */}
      {isAdmin && gestoesDinamicas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/70 backdrop-blur rounded-xl border border-border/50 w-fit shadow-sm">
          <button
            onClick={() => setSelectedGestaoAdmin(null)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              selectedGestaoAdmin === null
                ? "bg-[#1a4168] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            Total
          </button>
          {gestoesDinamicas.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGestaoAdmin(g)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                selectedGestaoAdmin === g
                  ? "bg-[#1a4168] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {labelGestao(g)}
            </button>
          ))}
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            title: "Orçamentos Aprovados",
            value: loading ? "—" : formatCurrencyFull(valorTotalAprovado),
            sub: `${orcamentosAprovados} aprovados`,
            icon: CheckCircle2,
            iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
          },
          {
            title: "Orçamentos Pendentes",
            value: loading ? "—" : String(orcamentosPendentes),
            sub: `de ${totalOrcamentos} no total`,
            icon: Clock,
            iconBg: "bg-amber-100", iconColor: "text-amber-600",
          },
          {
            title: "Oportunidades Abertas",
            value: loading ? "—" : String(totalOportunidades),
            sub: "em andamento",
            icon: Target,
            iconBg: "bg-blue-100", iconColor: "text-blue-600",
          },
          {
            title: "Ticket Médio",
            value: loading ? "—" : formatCurrencyFull(ticketMedio),
            sub: "por orçamento aprovado",
            icon: DollarSign,
            iconBg: "bg-amber-50", iconColor: "text-amber-600",
          },
        ].map(kpi => (
          <Card key={kpi.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                  <p className="text-xl font-heading font-bold text-foreground truncate">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.iconBg} shrink-0 ml-2`}>
                  <kpi.icon size={20} className={kpi.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pizza por status */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Orçamentos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum orçamento ainda</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-[200px] h-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${v} orçamentos`, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 justify-center w-full">
                  {statusData.map(entry => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                      <span className="text-xs font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Área 6 meses */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">Orçamentos — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tendenciaData}>
                  <defs>
                    <linearGradient id="qtyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(224, 64%, 33%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(224, 64%, 33%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="quantidade" name="quantidade"
                    stroke="hsl(224, 64%, 33%)" strokeWidth={2.5} fill="url(#qtyGradient)"
                    dot={{ r: 4, fill: "hsl(224, 64%, 33%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── IA + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CardIA />
        </div>
        <CardAlertas gestaoFiltro={effectiveFiltro} />
      </div>

      {/* ── Tarefas + Agenda (FIXOS — nunca filtrados) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CardTarefas />
        </div>
        <CardAgenda />
      </div>

      {/* ── Recentes + Por Gestão / Comissão ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orçamentos recentes */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Orçamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            ) : recentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum orçamento encontrado</p>
            ) : recentes.map(o => (
              <div key={o.id} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                <div className="p-1.5 rounded-lg bg-muted mt-0.5 shrink-0">
                  {statusIcon(o.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    #{o.numero} — {o.cliente_nome || o.cliente_razao_social || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.fornecedor_nome || o.operacao || "—"} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">{formatCurrency(parseFloat(o.total) || 0)}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-0.5 ${statusBadgeClass[o.status] || ""}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Lado direito: Por Gestão (admin + Total) | Comissão (comercial) | vazio (admin + gestão) */}
        {isAdmin && effectiveFiltro === null ? (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Building2 size={16} />
                Orçamentos por Gestão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : porGestao.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem dados por gestão</p>
              ) : porGestao.map(g => {
                const cor = gestaoColor(g.gestao);
                const pct = Math.round((g.valor / maxGestaoValor) * 100);
                return (
                  <div key={g.gestao} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{labelGestao(g.gestao)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{g.total} orç.</span>
                        <span className="text-xs font-semibold w-28 text-right">{formatCurrencyFull(g.valor)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: cor }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : !isAdmin ? (
          <CardComissao />
        ) : (
          /* Admin com gestão específica: resumo rápido */
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Building2 size={16} />
                Resumo — {labelGestao(effectiveFiltro!)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Total de Orçamentos",   value: totalOrcamentos,      icon: FileText,     color: "text-blue-600",    bg: "bg-blue-100" },
                { label: "Pendentes de Retorno",  value: orcamentosPendentes,  icon: Clock,        color: "text-amber-600",   bg: "bg-amber-100" },
                { label: "Aprovados",             value: orcamentosAprovados,  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
                { label: "Oportunidades Abertas", value: totalOportunidades,   icon: Users,        color: "text-purple-600",  bg: "bg-purple-100" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${item.bg}`}>
                      <item.icon size={14} className={item.color} />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold">{loading ? "—" : item.value}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Faturamento aprovado</span>
                  <span className="text-sm font-bold text-emerald-700">{loading ? "—" : formatCurrencyFull(valorTotalAprovado)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
