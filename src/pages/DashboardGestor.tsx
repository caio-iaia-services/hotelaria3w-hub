import { useEffect, useState } from "react";
import { FileText, Clock, Target, RefreshCw, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { formatCurrencyFull, labelGestao } from "@/lib/dashboardFormat";
import { CardAlertas } from "@/components/dashboard/CardAlertas";
import { CardComissao } from "@/components/dashboard/CardComissao";
import { CardTarefas } from "@/components/dashboard/CardTarefas";
import { CardAgenda } from "@/components/dashboard/CardAgenda";
import { CardOrcamentosAbertos } from "@/components/dashboard/CardOrcamentosAbertos";
import { CardOportunidadesParadas } from "@/components/dashboard/CardOportunidadesParadas";
import { AcoesRapidas } from "@/components/dashboard/AcoesRapidas";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const mesesLongos = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardGestor() {
  const { gestaoFiltro, perfil } = useAuth();

  const [loading, setLoading] = useState(true);
  const [atualizado, setAtualizado] = useState(new Date());
  const [orcamentosAbertos, setOrcamentosAbertos] = useState(0);
  const [aprovadosMesValor, setAprovadosMesValor] = useState(0);
  const [aprovadosMesQtd, setAprovadosMesQtd] = useState(0);
  const [oportunidadesAbertas, setOportunidadesAbertas] = useState(0);

  const [focarNovaTarefa, setFocarNovaTarefa] = useState(false);

  const carregar = async () => {
    setLoading(true);

    const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    let qAbertos = supabase.from("orcamentos").select("*", { count: "exact", head: true }).in("status", ["rascunho", "enviado"]);
    if (gestaoFiltro) qAbertos = qAbertos.eq("gestao", gestaoFiltro);

    let qAprovMes = supabase.from("orcamentos").select("total").eq("status", "aprovado").gte("created_at", primeiroDiaMes);
    if (gestaoFiltro) qAprovMes = qAprovMes.eq("gestao", gestaoFiltro);

    let qOp = supabase.from("oportunidades").select("*", { count: "exact", head: true }).eq("status", "em_andamento");
    if (gestaoFiltro) qOp = qOp.ilike("gestao", `%${gestaoFiltro}%`);

    const [{ count: countAbertos }, { data: aprovMes }, { count: countOp }] = await Promise.all([qAbertos, qAprovMes, qOp]);

    setOrcamentosAbertos(countAbertos || 0);
    const lista = (aprovMes || []) as { total: number | string }[];
    setAprovadosMesQtd(lista.length);
    setAprovadosMesValor(lista.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0));
    setOportunidadesAbertas(countOp || 0);

    setAtualizado(new Date());
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const agora = new Date();
  const primeiroNome = (perfil?.nome || "").split(" ")[0] || perfil?.nome || "";

  return (
    <div className="space-y-5 bg-[#dbdbdb] min-h-screen p-6 -m-6">

      {/* Hero do dia */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f2c47] to-[#1a4168] text-white p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-heading font-bold">{saudacao()}, {primeiroNome} 👋</h1>
          <p className="text-sm text-white/70 mt-1">
            {gestaoFiltro ? labelGestao(gestaoFiltro) : "Sem gestão atribuída"} · aqui está o que importa hoje
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-heading font-bold leading-none">{agora.getDate()}</p>
            <p className="text-[11px] text-white/70 uppercase tracking-wide mt-1">{diasSemana[agora.getDay()]} · {mesesLongos[agora.getMonth()]}</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-white hover:bg-white/10 hover:text-white" onClick={carregar} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            {atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Button>
        </div>
      </div>

      {/* Agenda + Tarefas de hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CardTarefas focarNovaTarefa={focarNovaTarefa} onFocoConcluido={() => setFocarNovaTarefa(false)} />
        </div>
        <CardAgenda />
      </div>

      {/* KPIs da própria gestão */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Orçamentos em Aberto</p>
              <p className="text-xl font-heading font-bold mt-1">{loading ? "—" : orcamentosAbertos}</p>
              <p className="text-xs text-muted-foreground mt-0.5">rascunho + enviado</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 shrink-0"><FileText size={20} className="text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Aprovados no Mês</p>
              <p className="text-xl font-heading font-bold mt-1">{loading ? "—" : formatCurrencyFull(aprovadosMesValor)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{aprovadosMesQtd} orçamento{aprovadosMesQtd === 1 ? "" : "s"}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 shrink-0"><Clock size={20} className="text-emerald-600" /></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Oportunidades Abertas</p>
              <p className="text-xl font-heading font-bold mt-1">{loading ? "—" : oportunidadesAbertas}</p>
              <p className="text-xs text-muted-foreground mt-0.5">em andamento</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-100 shrink-0"><Target size={20} className="text-purple-600" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas + Comissão */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CardAlertas gestaoFiltro={gestaoFiltro} />
        <CardComissao />
      </div>

      {/* Orçamentos em aberto + Oportunidades paradas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CardOrcamentosAbertos gestaoFiltro={gestaoFiltro} />
        <CardOportunidadesParadas gestaoFiltro={gestaoFiltro} />
      </div>

      {/* Ações rápidas */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
            <CalendarDays size={13} /> Ações rápidas
          </span>
          <AcoesRapidas onNovaTarefa={() => setFocarNovaTarefa(true)} />
        </CardContent>
      </Card>
    </div>
  );
}
