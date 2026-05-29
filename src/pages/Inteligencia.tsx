import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Brain, TrendingUp, BarChart3, Target, Zap, Send, RefreshCw,
  Plus, Edit2, X, Sparkles, Mail,
  Building2, Users, DollarSign, FileText, ArrowUpRight, ArrowDownRight,
  Loader2, Lightbulb, Trophy, MapPin, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, LabelList, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Meta {
  id: string;
  titulo: string;
  tipo: string;
  unidade: "brl" | "qtd" | "pct";
  valor_meta: number;
  periodo_tipo: string;
  data_inicio: string;
  data_fim: string;
  gestao: string | null;
  descricao: string | null;
  ativo: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface ContextoNegocio {
  crm: {
    total_cards: number;
    por_estagio: Record<string, number>;
    por_gestao: Record<string, number>;
    taxa_conversao_pct: number;
  };
  orcamentos: {
    total_mes_atual: number;
    volume_mes_atual: number;
    aprovados_mes: number;
    historico_12m: { mes: string; qtd: number; volume: number }[];
    top_fornecedores: { nome: string; volume: number; qtd: number }[];
  };
  financeiro: {
    receita_ytd: number;
    despesas_ytd: number;
    resultado_ytd: number;
    a_receber: number;
  };
  metas: Meta[];
  atendimento: {
    total_chats: number;
    chats_ia: number;
    chats_humano: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(v: number) {
  return v.toLocaleString("pt-BR");
}
function mesAno(iso: string) {
  const [a, m] = iso.slice(0, 7).split("-");
  const ms = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${ms[+m - 1]}/${a.slice(2)}`;
}

const STAGE_ORDER = ["lead","contato","proposta","negociacao","fechado","consolidacao","pos_venda","realizado"];
const STAGE_LABEL: Record<string, string> = {
  lead:"Lead", contato:"Contato", proposta:"Proposta",
  negociacao:"Negociação", fechado:"Fechado", consolidacao:"Consolidação",
  pos_venda:"Pós-Venda", realizado:"Realizado", perdido:"Perdido",
};
const STAGE_COR: Record<string, string> = {
  lead:"#94a3b8", contato:"#3b82f6", proposta:"#f59e0b",
  negociacao:"#f97316", fechado:"#22c55e", consolidacao:"#14b8a6",
  pos_venda:"#06b6d4", realizado:"#10b981", perdido:"#ef4444",
};
const META_TIPO_LABEL: Record<string, string> = {
  vendas_volume:"Volume de Vendas", vendas_qtd:"Qtd. Deals",
  comissao:"Receita Comissão", conversao:"Taxa Conversão",
  clientes_novos:"Novos Clientes", orcamentos_qtd:"Qtd. Orçamentos", custom:"Meta Livre",
};
const GESTAO_COR: Record<string, string> = { G1:"#3b82f6", G4:"#10b981", ADM:"#f59e0b" };

// ─── KPI mini card ─────────────────────────────────────────────────────────────
function KpiMini({ label, valor, icon: Icon, cor, delta, deltaPositivo }: {
  label: string; valor: string; icon: React.ElementType;
  cor: string; delta?: string; deltaPositivo?: boolean;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", cor)}>
          <Icon size={13} className="text-white" />
        </div>
      </div>
      <p className="text-xl font-bold font-heading">{valor}</p>
      {delta && (
        <div className={cn("flex items-center gap-1 mt-1 text-[11px]",
          deltaPositivo ? "text-emerald-600" : "text-red-500")}>
          {deltaPositivo ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {delta}
        </div>
      )}
    </div>
  );
}

// ─── Progresso de meta ─────────────────────────────────────────────────────────
function MetaProgress({ meta, valorAtual }: { meta: Meta; valorAtual: number }) {
  const pct = meta.valor_meta > 0 ? Math.min((valorAtual / meta.valor_meta) * 100, 100) : 0;
  const formatVal = (v: number) =>
    meta.unidade === "brl" ? fmtBRL(v) : meta.unidade === "pct" ? `${v.toFixed(1)}%` : fmtNum(v);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Target size={13} className="text-[#164B6E]" />
          <p className="text-sm font-medium">{meta.titulo}</p>
        </div>
        {meta.gestao && (
          <Badge variant="outline" className="text-[10px]" style={{ color: GESTAO_COR[meta.gestao] }}>
            {meta.gestao}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">{META_TIPO_LABEL[meta.tipo]} · {meta.periodo_tipo}</p>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all",
              pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Atual: <strong className="text-foreground">{formatVal(valorAtual)}</strong></span>
        <span>Meta: <strong className="text-foreground">{formatVal(meta.valor_meta)}</strong></span>
      </div>
    </div>
  );
}

// ─── Modal Meta ────────────────────────────────────────────────────────────────
function ModalMeta({ meta, onClose, onSaved }: {
  meta: Partial<Meta> | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!meta?.id;
  const hoje = new Date().toISOString().split("T")[0];
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

  const [form, setForm] = useState({
    titulo:       meta?.titulo ?? "",
    tipo:         meta?.tipo ?? "vendas_volume",
    unidade:      (meta?.unidade ?? "brl") as "brl"|"qtd"|"pct",
    valor_meta:   meta?.valor_meta?.toString() ?? "",
    periodo_tipo: meta?.periodo_tipo ?? "mensal",
    data_inicio:  meta?.data_inicio ?? hoje,
    data_fim:     meta?.data_fim ?? fimMes,
    gestao:       meta?.gestao ?? "",
    descricao:    meta?.descricao ?? "",
    ativo:        meta?.ativo ?? true,
  });
  const [salvando, setSalvando] = useState(false);

  // Auto-ajusta unidade pelo tipo
  useEffect(() => {
    const mapUnidade: Record<string, "brl"|"qtd"|"pct"> = {
      vendas_volume:"brl", comissao:"brl",
      vendas_qtd:"qtd", clientes_novos:"qtd", orcamentos_qtd:"qtd",
      conversao:"pct", custom:"brl",
    };
    setForm(f => ({ ...f, unidade: mapUnidade[f.tipo] ?? "brl" }));
  }, [form.tipo]);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.valor_meta) { toast.error("Preencha título e valor"); return; }
    setSalvando(true);
    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      unidade: form.unidade,
      valor_meta: parseFloat(form.valor_meta),
      periodo_tipo: form.periodo_tipo,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      gestao: form.gestao || null,
      descricao: form.descricao || null,
      ativo: form.ativo,
    };
    const { error } = isEdit
      ? await supabase.from("metas_empresa").update(payload).eq("id", meta!.id!)
      : await supabase.from("metas_empresa").insert(payload);
    if (error) toast.error("Erro ao salvar meta");
    else { toast.success(isEdit ? "Meta atualizada" : "Meta criada"); onSaved(); onClose(); }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
              <Target size={15} className="text-white" />
            </div>
            <h2 className="font-semibold text-sm">{isEdit ? "Editar Meta" : "Nova Meta"}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Volume de vendas G1 — Maio" className="text-sm h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {Object.entries(META_TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gestão</label>
              <select value={form.gestao} onChange={e => setForm(f => ({ ...f, gestao: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Toda empresa</option>
                <option value="G1">G1 — Gestão 1</option>
                <option value="G4">G4 — Gestão 4</option>
                <option value="ADM">ADM</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor Meta *</label>
              <Input value={form.valor_meta} onChange={e => setForm(f => ({ ...f, valor_meta: e.target.value }))}
                type="number" step="0.01" placeholder="0,00" className="text-sm h-9 font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Período</label>
              <select value={form.periodo_tipo} onChange={e => setForm(f => ({ ...f, periodo_tipo: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Início</label>
              <Input value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                type="date" className="text-sm h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fim</label>
              <Input value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                type="date" className="text-sm h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <Input value={form.descricao ?? ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Contexto ou critério de medição..." className="text-sm h-9" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/30">
          <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1 h-9 bg-[#164B6E] hover:bg-[#164B6E]/90" onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 size={13} className="animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5",
        isUser ? "bg-[#164B6E]" : "bg-violet-600")}>
        {isUser ? <Users size={11} className="text-white" /> : <Brain size={11} className="text-white" />}
      </div>
      <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
        isUser
          ? "bg-[#164B6E] text-white rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm")}>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <p className={cn("text-[9px] mt-1 opacity-60", isUser ? "text-right" : "text-left")}>
          {new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Inteligencia() {
  const [tab, setTab] = useState("visao-geral");
  const [loading, setLoading] = useState(true);

  // Dados
  const [cards, setCards]         = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [metas, setMetas]         = useState<Meta[]>([]);
  const [chats, setChats]         = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [clientes, setClientes]   = useState<any[]>([]);

  // Modais
  const [modalMeta, setModalMeta] = useState<Partial<Meta> | null | false>(false);

  // Chat
  const [chatMsgs, setChatMsgs]   = useState<ChatMsg[]>([{
    role: "assistant",
    content: "Olá! Sou o Agente de Inteligência da 3W Hotelaria. Posso analisar seus dados de vendas, CRM, financeiro e campanhas. O que você quer saber?",
    ts: Date.now(),
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Análise IA
  const [analiseIA, setAnaliseIA] = useState("");
  const [gerandoAnalise, setGerandoAnalise] = useState(false);
  const [analiseTs, setAnaliseTs] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [cardsRes, orcRes, lancRes, metasRes, chatsRes, fornRes, clientesRes] = await Promise.all([
      supabase.from("crm_cards").select("id,estagio,gestao,operacao,created_at").neq("estagio","perdido"),
      supabase.from("orcamentos").select("id,total,status,gestao,fornecedor_nome,fornecedor_id,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("lancamentos_financeiros").select("tipo,categoria,valor,status,data_competencia").neq("status","cancelado"),
      supabase.from("metas_empresa").select("*").eq("ativo", true).order("data_inicio", { ascending: false }),
      supabase.from("chats").select("id,canal,ia_ativa,status"),
      supabase.from("fornecedores").select("id,nome_fantasia,gestao,comissao_vendas").eq("status","ativo").order("nome_fantasia"),
      supabase.from("clientes").select("id,nome_fantasia,cidade,estado,segmento,status,relacao_comercial,status_prospeccao,total_pedidos_consolidados,qtd_comprada,data_primeira_compra,data_ultima_compra,created_at").limit(1000),
    ]);
    setCards(cardsRes.data ?? []);
    setOrcamentos(orcRes.data ?? []);
    setLancamentos(lancRes.data ?? []);
    setMetas((metasRes.data as Meta[]) ?? []);
    setChats(chatsRes.data ?? []);
    setFornecedores(fornRes.data ?? []);
    setClientes(clientesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // ── Contexto serializado para a IA ────────────────────────────────────────
  const buildContexto = useCallback((): ContextoNegocio => {
    const agora = new Date();
    const mesRef = agora.toISOString().slice(0, 7);

    // CRM
    const porEstagio: Record<string, number> = {};
    const porGestao:  Record<string, number> = {};
    cards.forEach(c => {
      porEstagio[c.estagio] = (porEstagio[c.estagio] ?? 0) + 1;
      porGestao[c.gestao]   = (porGestao[c.gestao]   ?? 0) + 1;
    });
    const totalLeads = cards.length;
    const consolidados = porEstagio["consolidacao"] ?? 0 + (porEstagio["realizado"] ?? 0);
    const taxaConv = totalLeads > 0 ? (consolidados / totalLeads) * 100 : 0;

    // Orçamentos
    const orcMes = orcamentos.filter(o => o.created_at?.slice(0, 7) === mesRef);
    const volMes = orcMes.reduce((a, o) => a + (o.total ?? 0), 0);
    const aprovMes = orcMes.filter(o => o.status === "aprovado").length;

    // Histórico 12m
    const hist12m: Record<string, { qtd: number; volume: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const k = d.toISOString().slice(0, 7);
      hist12m[k] = { qtd: 0, volume: 0 };
    }
    orcamentos.forEach(o => {
      const k = o.created_at?.slice(0, 7);
      if (hist12m[k]) { hist12m[k].qtd++; hist12m[k].volume += o.total ?? 0; }
    });

    // Top fornecedores
    const porForn: Record<string, { nome: string; volume: number; qtd: number }> = {};
    orcamentos.forEach(o => {
      if (!o.fornecedor_nome) return;
      if (!porForn[o.fornecedor_nome]) porForn[o.fornecedor_nome] = { nome: o.fornecedor_nome, volume: 0, qtd: 0 };
      porForn[o.fornecedor_nome].volume += o.total ?? 0;
      porForn[o.fornecedor_nome].qtd++;
    });

    // Financeiro YTD
    const anoRef = agora.getFullYear().toString();
    const lancYTD = lancamentos.filter(l => l.data_competencia?.startsWith(anoRef));
    const recYTD  = lancYTD.filter(l => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
    const desYTD  = lancYTD.filter(l => l.tipo === "saida").reduce((a, l) => a + l.valor, 0);
    const aReceber = lancamentos.filter(l => l.tipo === "entrada" && ["pendente","confirmado"].includes(l.status)).reduce((a, l) => a + l.valor, 0);

    return {
      crm: { total_cards: totalLeads, por_estagio: porEstagio, por_gestao: porGestao, taxa_conversao_pct: +taxaConv.toFixed(1) },
      orcamentos: {
        total_mes_atual: orcMes.length,
        volume_mes_atual: volMes,
        aprovados_mes: aprovMes,
        historico_12m: Object.entries(hist12m).map(([mes, v]) => ({ mes, ...v })),
        top_fornecedores: Object.values(porForn).sort((a, b) => b.volume - a.volume).slice(0, 8),
      },
      financeiro: { receita_ytd: recYTD, despesas_ytd: desYTD, resultado_ytd: recYTD - desYTD, a_receber: aReceber },
      metas,
      atendimento: {
        total_chats: chats.length,
        chats_ia: chats.filter(c => c.ia_ativa).length,
        chats_humano: chats.filter(c => !c.ia_ativa).length,
      },
    };
  }, [cards, orcamentos, lancamentos, metas, chats]);

  // ── Chat com agente ───────────────────────────────────────────────────────
  const enviarMensagem = async () => {
    const txt = chatInput.trim();
    if (!txt || chatLoading) return;
    setChatInput("");
    const userMsg: ChatMsg = { role: "user", content: txt, ts: Date.now() };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatLoading(true);

    const histAntropico = [...chatMsgs.filter(m => m.role !== "assistant" || chatMsgs.indexOf(m) > 0), userMsg]
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/agente-inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: histAntropico, context: buildContexto() }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro");
      setChatMsgs(prev => [...prev, { role: "assistant", content: json.content, ts: Date.now() }]);
    } catch (err) {
      setChatMsgs(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Não foi possível conectar ao agente. Verifique se a chave ANTHROPIC_API_KEY está configurada no Vercel.\n\nErro: ${String(err)}`,
        ts: Date.now(),
      }]);
    }
    setChatLoading(false);
  };

  // ── Análise IA completa ───────────────────────────────────────────────────
  const gerarAnalise = async () => {
    setGerandoAnalise(true);
    const prompt = `Faça uma análise completa do negócio 3W Hotelaria com base nos dados fornecidos.

Estruture a análise em:
1. **Resumo Executivo** (2-3 linhas)
2. **Performance de Vendas** — pontos fortes e oportunidades
3. **Análise do Funil CRM** — gargalos e taxa de conversão
4. **Performance por Gestão** — G1 vs G4 vs ADM
5. **Saúde Financeira** — receita, despesas, tendências
6. **Fornecedores** — top performers e oportunidades
7. **Alertas e Riscos** — o que precisa de atenção imediata
8. **Recomendações Táticas** — 3 ações prioritárias para os próximos 30 dias`;

    try {
      const res = await fetch("/api/agente-inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          context: buildContexto(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro");
      setAnaliseIA(json.content);
      setAnaliseTs(new Date());
    } catch (err) {
      toast.error("Erro ao gerar análise: " + String(err));
    }
    setGerandoAnalise(false);
  };

  // ── Dados derivados ───────────────────────────────────────────────────────
  const mesRef = new Date().toISOString().slice(0, 7);

  // Funil CRM
  const funnelData = STAGE_ORDER.map(s => ({
    name: STAGE_LABEL[s],
    value: cards.filter(c => c.estagio === s).length,
    fill: STAGE_COR[s],
  })).filter(d => d.value > 0);

  // Orçamentos por mês (últimos 12)
  const orcHistorico = (() => {
    const agora = new Date();
    const meses: Record<string, { mes: string; volume: number; qtd: number; aprovados: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const k = d.toISOString().slice(0, 7);
      meses[k] = { mes: mesAno(k + "-01"), volume: 0, qtd: 0, aprovados: 0 };
    }
    orcamentos.forEach(o => {
      const k = o.created_at?.slice(0, 7);
      if (!meses[k]) return;
      meses[k].qtd++;
      meses[k].volume += o.total ?? 0;
      if (o.status === "aprovado" || o.status === "consolidado") meses[k].aprovados++;
    });
    return Object.values(meses);
  })();

  // Performance por gestão (apenas gestores comerciais)
  const gestaoPerf = ["G1","G4"].map(g => {
    const orcG = orcamentos.filter(o => o.gestao === g);
    const cardsG = cards.filter(c => c.gestao === g);
    const consolidadosG = cardsG.filter(c => ["consolidacao","realizado"].includes(c.estagio)).length;
    const taxaG = cardsG.length > 0 ? (consolidadosG / cardsG.length) * 100 : 0;
    return {
      gestao: g,
      volume: orcG.reduce((a, o) => a + (o.total ?? 0), 0),
      qtd_orcamentos: orcG.length,
      qtd_cards: cardsG.length,
      consolidados: consolidadosG,
      taxa_conv: +taxaG.toFixed(1),
    };
  });

  // Top fornecedores
  const topFornecedores = (() => {
    const porForn: Record<string, { nome: string; volume: number; qtd: number; aprovados: number }> = {};
    orcamentos.forEach(o => {
      if (!o.fornecedor_nome) return;
      if (!porForn[o.fornecedor_nome]) porForn[o.fornecedor_nome] = { nome: o.fornecedor_nome, volume: 0, qtd: 0, aprovados: 0 };
      porForn[o.fornecedor_nome].volume += o.total ?? 0;
      porForn[o.fornecedor_nome].qtd++;
      if (["aprovado","consolidado"].includes(o.status)) porForn[o.fornecedor_nome].aprovados++;
    });
    return Object.values(porForn).sort((a, b) => b.volume - a.volume).slice(0, 10);
  })();

  // KPIs gerais
  const totalLeads = cards.length;
  const consolidados = cards.filter(c => ["consolidacao","realizado"].includes(c.estagio)).length;
  const taxaConvGeral = totalLeads > 0 ? (consolidados / totalLeads * 100).toFixed(1) : "0";
  const orcMes = orcamentos.filter(o => o.created_at?.slice(0, 7) === mesRef);
  const volOrcMes = orcMes.reduce((a, o) => a + (o.total ?? 0), 0);
  const recYTD = lancamentos.filter(l => l.tipo === "entrada" && l.data_competencia?.startsWith(new Date().getFullYear().toString())).reduce((a, l) => a + l.valor, 0);

  // Previsão (simples: média histórica dos últimos 3 meses como base)
  const previsaoData = (() => {
    const ultimos3 = orcHistorico.slice(-3);
    const mediaVol = ultimos3.reduce((a, m) => a + m.volume, 0) / 3;
    const mediaQtd = ultimos3.reduce((a, m) => a + m.qtd, 0) / 3;
    const agora = new Date();
    const prev = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
      prev.push({
        mes: mesAno(d.toISOString().slice(0, 7) + "-01"),
        volume: 0,
        volume_prev: +(mediaVol * (1 + i * 0.03)).toFixed(0),
        qtd: 0,
        qtd_prev: +(mediaQtd * (1 + i * 0.02)).toFixed(0),
        projecao: true,
      });
    }
    return [...orcHistorico.slice(-6).map(m => ({ ...m, volume_prev: null, qtd_prev: null, projecao: false })), ...prev];
  })();

  // Valores atuais para metas
  const valorAtualMeta = (meta: Meta): number => {
    const agora = new Date();
    const mesAtual = agora.toISOString().slice(0, 7);
    switch (meta.tipo) {
      case "vendas_volume":
        return orcamentos.filter(o =>
          o.created_at?.slice(0, 7) === mesAtual &&
          (!meta.gestao || o.gestao === meta.gestao)
        ).reduce((a, o) => a + (o.total ?? 0), 0);
      case "vendas_qtd":
        return orcamentos.filter(o =>
          o.created_at?.slice(0, 7) === mesAtual &&
          (!meta.gestao || o.gestao === meta.gestao) &&
          ["aprovado","consolidado"].includes(o.status)
        ).length;
      case "comissao":
        return lancamentos.filter(l =>
          l.tipo === "entrada" && l.data_competencia?.slice(0, 7) === mesAtual
        ).reduce((a, l) => a + l.valor, 0);
      case "conversao":
        return parseFloat(taxaConvGeral);
      case "orcamentos_qtd":
        return orcamentos.filter(o =>
          o.created_at?.slice(0, 7) === mesAtual &&
          (!meta.gestao || o.gestao === meta.gestao)
        ).length;
      default: return 0;
    }
  };

  // Formata markdown simples para exibição
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("# "))  return <h1 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold mt-3 mb-1 text-[#164B6E]">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold text-sm my-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <li key={i} className="text-sm ml-4 my-0.5 list-disc">{line.slice(2)
          .replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      // bold inline
      const parts = line.split(/\*\*(.*?)\*\*/);
      if (parts.length > 1) {
        return <p key={i} className="text-sm my-0.5">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
      }
      return <p key={i} className="text-sm my-0.5">{line}</p>;
    });
  };

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── CONTEÚDO PRINCIPAL ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
            <div>
              <h1 className="font-heading text-base font-semibold">Inteligência</h1>
              <p className="text-[11px] text-muted-foreground">Análises, previsões e metas do negócio</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={carregar} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 border-b border-border/50 bg-card shrink-0">
            <TabsList className="h-8 gap-0.5 bg-transparent p-0 flex-wrap">
              {[
                { key:"visao-geral", label:"Visão Geral",    icon: BarChart3 },
                { key:"previsao",    label:"Previsão",       icon: TrendingUp },
                { key:"performance", label:"Performance",    icon: Zap },
                { key:"fornecedores",label:"Fornecedores",   icon: Building2 },
                { key:"clientes",    label:"Clientes",       icon: Users },
                { key:"marketing",   label:"Marketing",      icon: Mail },
                { key:"metas",       label:"Metas",          icon: Target },
                { key:"analise-ia",  label:"Análise IA",     icon: Sparkles },
              ].map(t => (
                <TabsTrigger key={t.key} value={t.key}
                  className="h-8 px-2.5 text-[11px] gap-1 data-[state=active]:border-b-2 data-[state=active]:border-[#164B6E] data-[state=active]:text-[#164B6E] rounded-none shrink-0">
                  <t.icon size={11} />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── VISÃO GERAL ─────────────────────────────────────────────── */}
          <TabsContent value="visao-geral" className="flex-1 overflow-auto p-5 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiMini label="Oportunidades Ativas" valor={fmtNum(totalLeads)}       icon={FileText}   cor="bg-blue-500" />
              <KpiMini label="Taxa de Conversão"    valor={`${taxaConvGeral}%`}       icon={TrendingUp} cor="bg-emerald-600" />
              <KpiMini label="Volume Orç. Mês"      valor={fmtBRL(volOrcMes)}         icon={DollarSign} cor="bg-amber-500" />
              <KpiMini label="Receita Comis. YTD"   valor={fmtBRL(recYTD)}            icon={Trophy}     cor="bg-[#164B6E]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Funil CRM */}
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Funil CRM — Cards por Estágio</h3>
                {funnelData.length > 0 ? (
                  <div className="space-y-1.5">
                    {STAGE_ORDER.filter(s => (cards.filter(c => c.estagio === s).length) > 0).map(s => {
                      const count = cards.filter(c => c.estagio === s).length;
                      const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <span className="text-xs w-24 text-right text-muted-foreground shrink-0">{STAGE_LABEL[s]}</span>
                          <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                            <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: STAGE_COR[s] }} />
                          </div>
                          <span className="text-xs font-bold w-8 shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum card no CRM</p>
                )}
              </div>

              {/* Volume por gestão */}
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Orçamentos por Gestão (R$)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gestaoPerf} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="gestao" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="volume" name="Volume" radius={[4,4,0,0]}>
                      {gestaoPerf.map(g => <Cell key={g.gestao} fill={GESTAO_COR[g.gestao] ?? "#164B6E"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume orçamentos 12m */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Volume de Orçamentos — 12 Meses</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={orcHistorico} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="volume" name="Volume R$" fill="#164B6E" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* ── PREVISÃO ────────────────────────────────────────────────── */}
          <TabsContent value="previsao" className="flex-1 overflow-auto p-5 space-y-5">
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold">Previsão de Volume de Orçamentos</h3>
                <Badge variant="outline" className="text-[10px]">Baseado em média histórica</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4">
                Últimos 6 meses realizados + 3 meses projetados (tendência de crescimento 3%/mês)
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={previsaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => v ? fmtBRL(v) : "—"} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="volume"      name="Realizado"  stroke="#164B6E"  strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line dataKey="volume_prev" name="Projetado"  stroke="#f59e0b"  strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pipeline atual por estágio com valor médio */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Pipeline CRM — Oportunidades em andamento</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {["proposta","negociacao","fechado","consolidacao"].map(s => {
                  const count = cards.filter(c => c.estagio === s).length;
                  return (
                    <div key={s} className="border border-border/50 rounded-lg p-3 text-center">
                      <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: STAGE_COR[s] }} />
                      <p className="text-xs text-muted-foreground">{STAGE_LABEL[s]}</p>
                      <p className="text-2xl font-bold font-heading mt-1">{count}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">oportunidades</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Lightbulb size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Como melhorar as previsões</p>
                  <p className="text-xs text-amber-700 mt-1">
                    As projeções ficam mais precisas com mais histórico de orçamentos e lançamentos financeiros cadastrados.
                    Preencha também as taxas de comissão dos fornecedores para previsão de receita.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── PERFORMANCE ─────────────────────────────────────────────── */}
          <TabsContent value="performance" className="flex-1 overflow-auto p-5 space-y-5">
            <h3 className="text-sm font-semibold">Performance por Gestão</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {gestaoPerf.map(g => (
                <div key={g.gestao} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GESTAO_COR[g.gestao] }} />
                    <p className="font-semibold">{g.gestao === "G1" ? "Gestão 1 — Fabiano" : "Gestão 4 — Alex"}</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Volume Orçamentos", val: fmtBRL(g.volume) },
                      { label: "Qtd. Orçamentos",   val: fmtNum(g.qtd_orcamentos) },
                      { label: "Cards no CRM",       val: fmtNum(g.qtd_cards) },
                      { label: "Consolidados",       val: fmtNum(g.consolidados) },
                      { label: "Taxa Conversão",     val: `${g.taxa_conv}%` },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-bold">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4">Comparativo por Gestão</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gestaoPerf} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="gestao" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="vol" orientation="left"  tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="qtd" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="vol" dataKey="volume"         name="Volume R$"  radius={[4,4,0,0]}>
                    {gestaoPerf.map(g => <Cell key={g.gestao} fill={GESTAO_COR[g.gestao]} />)}
                  </Bar>
                  <Bar yAxisId="qtd" dataKey="qtd_orcamentos" name="Qtd. Orç."  fill="#e2e8f0" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* ── FORNECEDORES ─────────────────────────────────────────────── */}
          <TabsContent value="fornecedores" className="flex-1 overflow-auto p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold">Performance por Fornecedor / Marca</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ranking por volume de orçamentos gerados</p>
            </div>

            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/50">
                  <tr>
                    {["#","Fornecedor","Volume","Qtd. Orç.","Aprovados","Conv. %"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {topFornecedores.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Nenhum orçamento com fornecedor cadastrado</td></tr>
                  ) : topFornecedores.map((f, i) => {
                    const conv = f.qtd > 0 ? ((f.aprovados / f.qtd) * 100).toFixed(1) : "0";
                    return (
                      <tr key={f.nome} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-bold text-muted-foreground">#{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs font-medium">{f.nome}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">{fmtBRL(f.volume)}</td>
                        <td className="px-4 py-2.5 text-xs">{f.qtd}</td>
                        <td className="px-4 py-2.5 text-xs">{f.aprovados}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-bold", parseFloat(conv) >= 50 ? "text-emerald-600" : parseFloat(conv) >= 25 ? "text-amber-600" : "text-red-500")}>
                            {conv}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Top 10 Fornecedores — Volume R$</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topFornecedores} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="volume" name="Volume" fill="#164B6E" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* ── CLIENTES ────────────────────────────────────────────────── */}
          <TabsContent value="clientes" className="flex-1 overflow-auto p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold">Análise de Clientes</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Visão completa da base de clientes — perfil, distribuição e histórico</p>
            </div>

            {/* KPIs clientes */}
            {(() => {
              const ativos   = clientes.filter(c => c.status === "ativo").length;
              const inativos = clientes.filter(c => c.status !== "ativo").length;
              const compradores = clientes.filter(c => (c.qtd_comprada ?? 0) > 0).length;
              const volTotal = clientes.reduce((a: number, c: any) => a + (c.total_pedidos_consolidados ?? 0), 0);
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiMini label="Total Clientes"   valor={fmtNum(clientes.length)} icon={Users}      cor="bg-blue-500" />
                  <KpiMini label="Clientes Ativos"  valor={fmtNum(ativos)}          icon={Trophy}     cor="bg-emerald-600" />
                  <KpiMini label="Já Compraram"     valor={fmtNum(compradores)}     icon={ShoppingBag} cor="bg-[#164B6E]" />
                  <KpiMini label="Volume Consolidado" valor={fmtBRL(volTotal)}       icon={DollarSign} cor="bg-amber-500" />
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Por segmento */}
              {(() => {
                const porSeg: Record<string, number> = {};
                clientes.forEach((c: any) => {
                  const segs = Array.isArray(c.segmento) ? c.segmento : c.segmento ? [c.segmento] : ["Não informado"];
                  segs.forEach((s: string) => { porSeg[s] = (porSeg[s] ?? 0) + 1; });
                });
                const data = Object.entries(porSeg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
                return (
                  <div className="bg-card border border-border/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3">Distribuição por Segmento</h3>
                    {data.length > 0 ? (
                      <div className="space-y-2">
                        {data.map(d => {
                          const pct = clientes.length > 0 ? (d.value / clientes.length) * 100 : 0;
                          return (
                            <div key={d.name} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{d.name}</span>
                              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-[#164B6E] rounded transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold w-8 text-right shrink-0">{d.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados de segmento</p>}
                  </div>
                );
              })()}

              {/* Por estado */}
              {(() => {
                const porEstado: Record<string, number> = {};
                clientes.forEach((c: any) => {
                  const est = c.estado ?? "N/I";
                  porEstado[est] = (porEstado[est] ?? 0) + 1;
                });
                const data = Object.entries(porEstado).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
                return (
                  <div className="bg-card border border-border/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted-foreground" /> Distribuição por Estado
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data} layout="vertical" barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={30} />
                        <Tooltip />
                        <Bar dataKey="value" name="Clientes" fill="#164B6E" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>

            {/* Por prospecção */}
            {(() => {
              const porProsp: Record<string, number> = {};
              clientes.forEach((c: any) => {
                const p = c.status_prospeccao ?? "Não informado";
                porProsp[p] = (porProsp[p] ?? 0) + 1;
              });
              const data = Object.entries(porProsp).sort((a, b) => b[1] - a[1]);
              const PROSP_COR: Record<string, string> = {
                "Ativo": "#10b981", "Em prospecção": "#3b82f6", "Frio": "#94a3b8",
                "Inativo": "#f97316", "Não informado": "#e2e8f0",
              };
              return (
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Status de Prospecção</h3>
                  <div className="flex flex-wrap gap-3">
                    {data.map(([label, count]) => (
                      <div key={label} className="flex items-center gap-2 border border-border/50 rounded-lg px-3 py-2 bg-muted/30">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PROSP_COR[label] ?? "#94a3b8" }} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold ml-1">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Top clientes por volume */}
            {(() => {
              const top = [...clientes]
                .filter((c: any) => (c.total_pedidos_consolidados ?? 0) > 0)
                .sort((a: any, b: any) => (b.total_pedidos_consolidados ?? 0) - (a.total_pedidos_consolidados ?? 0))
                .slice(0, 10);
              if (top.length === 0) return null;
              return (
                <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30">
                    <h3 className="text-sm font-semibold">Top Clientes — Volume Consolidado</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        {["#","Cliente","Cidade/Estado","Segmento","Compras","Volume"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {top.map((c: any, i: number) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 text-xs font-bold text-muted-foreground">#{i+1}</td>
                          <td className="px-4 py-2 text-xs font-medium max-w-[180px] truncate">{c.nome_fantasia}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[100px]">
                            {Array.isArray(c.segmento) ? c.segmento[0] : c.segmento ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-xs">{c.qtd_comprada ?? 0}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-emerald-600">{fmtBRL(c.total_pedidos_consolidados ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </TabsContent>

          {/* ── MARKETING ────────────────────────────────────────────────── */}
          <TabsContent value="marketing" className="flex-1 overflow-auto p-5">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
                <Mail size={28} className="text-violet-500" />
              </div>
              <h3 className="text-base font-semibold">Análise de Campanhas de Marketing</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Esta seção exibirá análises das campanhas de email marketing, taxas de abertura,
                cliques e conversões geradas por campanha.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-left max-w-xs w-full">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Taxa de abertura por campanha
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Cliques e conversões em oportunidades
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Comparativo entre campanhas
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  ROI por segmento e período
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-6 italic">
                Disponível após integração com os dados de campanhas do módulo Marketing
              </p>
            </div>
          </TabsContent>

          {/* ── METAS ───────────────────────────────────────────────────── */}
          <TabsContent value="metas" className="flex-1 overflow-auto p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Metas da Empresa</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Defina e acompanhe as metas comerciais e financeiras</p>
              </div>
              <Button size="sm" className="h-7 text-xs gap-1 bg-[#164B6E] hover:bg-[#164B6E]/90"
                onClick={() => setModalMeta({})}>
                <Plus size={11} /> Nova Meta
              </Button>
            </div>

            {metas.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
                <Target size={40} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">Nenhuma meta cadastrada</p>
                <p className="text-xs mt-1">Crie metas para acompanhar o progresso da empresa</p>
                <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => setModalMeta({})}>
                  <Plus size={11} className="mr-1" /> Criar primeira meta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {metas.map(m => (
                  <div key={m.id} className="relative">
                    <MetaProgress meta={m} valorAtual={valorAtualMeta(m)} />
                    <button
                      onClick={() => setModalMeta(m)}
                      className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Edit2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── ANÁLISE IA ──────────────────────────────────────────────── */}
          <TabsContent value="analise-ia" className="flex-1 overflow-auto p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles size={15} className="text-violet-500" />
                  Análise Completa por IA
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  O agente lê todos os dados do negócio e gera um relatório executivo com insights e recomendações
                </p>
              </div>
              <div className="flex items-center gap-2">
                {analiseTs && (
                  <span className="text-[10px] text-muted-foreground">
                    Gerado às {analiseTs.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
                  </span>
                )}
                <Button size="sm"
                  className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={gerarAnalise} disabled={gerandoAnalise || loading}>
                  {gerandoAnalise
                    ? <><Loader2 size={11} className="animate-spin" /> Analisando...</>
                    : <><Sparkles size={11} /> {analiseIA ? "Reanalisar" : "Gerar Análise"}</>}
                </Button>
              </div>
            </div>

            {!analiseIA && !gerandoAnalise && (
              <div className="border border-dashed border-violet-200 rounded-xl p-12 text-center">
                <Brain size={48} className="mx-auto mb-3 text-violet-300" />
                <p className="text-sm font-medium text-muted-foreground">Pronto para analisar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Gerar Análise" para o agente examinar todos os dados e produzir um relatório executivo
                </p>
              </div>
            )}

            {gerandoAnalise && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                  <Brain size={22} className="text-violet-500 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Analisando dados do negócio...</p>
                <p className="text-xs text-muted-foreground">CRM, orçamentos, financeiro, metas, atendimento</p>
              </div>
            )}

            {analiseIA && !gerandoAnalise && (
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <div className="prose prose-sm max-w-none">
                  {renderMarkdown(analiseIA)}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── CHAT LATERAL FIXO ──────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-l border-border/50 flex flex-col bg-card overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
              <Brain size={13} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold">Agente de Inteligência</p>
              <p className="text-[10px] text-muted-foreground">Pergunte sobre seus dados</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        </div>

        {/* Sugestões rápidas */}
        <div className="px-3 py-2 border-b border-border/30 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1.5">Perguntas rápidas:</p>
          <div className="flex flex-wrap gap-1">
            {[
              "Qual a taxa de conversão?",
              "Qual fornecedor tem mais orçamentos?",
              "Como está a receita este mês?",
              "Quais os gargalos no CRM?",
            ].map(q => (
              <button
                key={q}
                onClick={() => { setChatInput(q); }}
                className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-[#164B6E]/10 hover:text-[#164B6E] text-muted-foreground transition-colors border border-border/50">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
          {chatMsgs.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {chatLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <Brain size={11} className="text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay:"0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay:"150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay:"300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border/50 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder="Pergunte sobre seus dados..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="sm"
              className="h-9 px-2.5 bg-[#164B6E] hover:bg-[#164B6E]/90 shrink-0"
              onClick={enviarMensagem} disabled={chatLoading || !chatInput.trim()}>
              <Send size={13} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter envia · Shift+Enter nova linha
          </p>
        </div>
      </div>

      {modalMeta !== false && (
        <ModalMeta meta={modalMeta} onClose={() => setModalMeta(false)} onSaved={carregar} />
      )}
    </div>
  );
}
