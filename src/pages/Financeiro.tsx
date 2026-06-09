import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, Plus, Edit2, Trash2,
  CheckCircle, X, ChevronDown, Search, Settings, Users, Building2,
  BarChart3, List, RefreshCw, Filter, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  tipo: "gestor" | "colaborador";
  gestao: string | null;
  percentual_vendas_proprias: number;
  percentual_todas_vendas: number;
  valor_fixo: number;
  ativo: boolean;
}

interface Lancamento {
  id: string;
  tipo: "entrada" | "saida";
  categoria: string;
  orcamento_id: string | null;
  card_id: string | null;
  fornecedor_id: string | null;
  colaborador_id: string | null;
  valor_base: number | null;
  percentual: number | null;
  valor: number;
  status: "pendente" | "confirmado" | "pago" | "cancelado";
  data_competencia: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  descricao: string | null;
  observacoes: string | null;
  origem: "manual" | "automatico";
  created_at: string;
  recorrente?: boolean;
  frequencia?: string | null;
  categoria_id?: string | null;
  // joins
  colaborador?: { nome: string } | null;
  fornecedor?: { nome_fantasia: string } | null;
  orcamento?: { numero: string } | null;
}

interface Fornecedor {
  id: string;
  nome_fantasia: string;
  comissao_vendas: number | null;
  gestao: string | null;
}

interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: "entrada" | "saida";
  cor: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIAS: Record<string, { label: string; tipo: "entrada" | "saida"; cor: string }> = {
  comissao_fornecedor: { label: "Comissão Fornecedor", tipo: "entrada", cor: "text-emerald-600" },
  receita_extra:       { label: "Receita Extra",       tipo: "entrada", cor: "text-emerald-500" },
  comissao_gestor:     { label: "Comissão Gestor",     tipo: "saida",   cor: "text-orange-600" },
  comissao_colaborador:{ label: "Comissão Colaborador",tipo: "saida",   cor: "text-orange-500" },
  despesa_fixa:        { label: "Despesa Fixa",        tipo: "saida",   cor: "text-red-600" },
  despesa_variavel:    { label: "Despesa Variável",    tipo: "saida",   cor: "text-red-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendente:    { label: "Pendente",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  confirmado:  { label: "Confirmado",  color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  pago:        { label: "Pago",        color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cancelado:   { label: "Cancelado",   color: "text-slate-500",   bg: "bg-slate-50 border-slate-200" },
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAno(dateStr: string) {
  const [ano, mes] = dateStr.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7) + "-01";
}

const CORES_PIZZA = ["#164B6E","#2e7d9a","#4a9aba","#68b8d4","#91cfe0","#b8e4ee"];

const FREQUENCIAS: Record<string, string> = {
  diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal",
  mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral",
  semestral: "Semestral", anual: "Anual",
};

const CORES_CATEGORIA = [
  "#164B6E","#059669","#dc2626","#d97706","#7c3aed","#db2777",
  "#0891b2","#65a30d","#ea580c","#4f46e5","#0d9488","#be185d",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, icon: Icon, cor, sub }: {
  label: string; valor: number; icon: React.ElementType;
  cor: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", cor)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold font-heading mt-0.5">{formatBRL(valor)}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Modal de lançamento ──────────────────────────────────────────────────────
function ModalLancamento({
  lancamento, colaboradores, fornecedores, onClose, onSaved,
}: {
  lancamento: Partial<Lancamento> | null;
  colaboradores: Colaborador[];
  fornecedores: Fornecedor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lancamento?.id;
  const [form, setForm] = useState({
    tipo:             (lancamento?.tipo ?? "entrada") as "entrada" | "saida",
    categoria:        lancamento?.categoria ?? "comissao_fornecedor",
    valor_base:       lancamento?.valor_base?.toString() ?? "",
    percentual:       lancamento?.percentual?.toString() ?? "",
    valor:            lancamento?.valor?.toString() ?? "",
    status:           lancamento?.status ?? "pendente",
    data_competencia: lancamento?.data_competencia ?? mesAtual(),
    data_vencimento:  lancamento?.data_vencimento ?? "",
    data_pagamento:   lancamento?.data_pagamento ?? "",
    descricao:        lancamento?.descricao ?? "",
    observacoes:      lancamento?.observacoes ?? "",
    colaborador_id:   lancamento?.colaborador_id ?? "",
    fornecedor_id:    lancamento?.fornecedor_id ?? "",
    recorrente:       lancamento?.recorrente ?? false,
    frequencia:       lancamento?.frequencia ?? "mensal",
  });
  const [salvando, setSalvando] = useState(false);

  // Recalcula valor automaticamente quando base e percentual mudam
  useEffect(() => {
    const base = parseFloat(form.valor_base);
    const pct  = parseFloat(form.percentual);
    if (!isNaN(base) && !isNaN(pct)) {
      setForm(f => ({ ...f, valor: ((base * pct) / 100).toFixed(2) }));
    }
  }, [form.valor_base, form.percentual]);

  // Sincroniza categoria com tipo
  useEffect(() => {
    const catInfo = CATEGORIAS[form.categoria];
    if (catInfo && catInfo.tipo !== form.tipo) {
      const primeira = Object.entries(CATEGORIAS).find(([, v]) => v.tipo === form.tipo);
      if (primeira) setForm(f => ({ ...f, categoria: primeira[0] }));
    }
  }, [form.tipo]);

  const salvar = async () => {
    if (!form.valor || parseFloat(form.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSalvando(true);
    const payload = {
      tipo:             form.tipo,
      categoria:        form.categoria,
      valor_base:       form.valor_base ? parseFloat(form.valor_base) : null,
      percentual:       form.percentual ? parseFloat(form.percentual) : null,
      valor:            parseFloat(form.valor),
      status:           form.status,
      data_competencia: form.data_competencia.slice(0, 7) + "-01",
      data_vencimento:  form.data_vencimento || null,
      data_pagamento:   form.data_pagamento  || null,
      descricao:        form.descricao       || null,
      observacoes:      form.observacoes     || null,
      colaborador_id:   form.colaborador_id  || null,
      fornecedor_id:    form.fornecedor_id   || null,
      recorrente:       form.recorrente,
      frequencia:       form.recorrente ? form.frequencia : null,
      origem:           "manual",
    };

    const { error } = isEdit
      ? await supabase.from("lancamentos_financeiros").update(payload).eq("id", lancamento!.id!)
      : await supabase.from("lancamentos_financeiros").insert(payload);

    if (error) {
      toast.error("Erro ao salvar lançamento");
    } else {
      toast.success(isEdit ? "Lançamento atualizado" : "Lançamento criado");
      onSaved();
      onClose();
    }
    setSalvando(false);
  };

  const catsFiltradas = Object.entries(CATEGORIAS).filter(([, v]) => v.tipo === form.tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
              <DollarSign size={15} className="text-white" />
            </div>
            <h2 className="font-semibold text-sm">{isEdit ? "Editar Lançamento" : "Novo Lançamento"}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <div className="flex gap-2">
              {(["entrada", "saida"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-xs font-medium transition-colors",
                    form.tipo === t
                      ? t === "entrada" ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t === "entrada" ? "↑ Entrada" : "↓ Saída"}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria</label>
            <select
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {catsFiltradas.map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Valor base + % + valor calculado */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor Base (R$)</label>
              <Input
                value={form.valor_base}
                onChange={e => setForm(f => ({ ...f, valor_base: e.target.value }))}
                placeholder="0,00"
                className="text-sm h-9"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">% Comissão</label>
              <Input
                value={form.percentual}
                onChange={e => setForm(f => ({ ...f, percentual: e.target.value }))}
                placeholder="0,00"
                className="text-sm h-9"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor (R$) <span className="text-red-500">*</span></label>
              <Input
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                className="text-sm h-9 font-semibold"
                type="number"
                step="0.01"
              />
            </div>
          </div>

          {/* Colaborador / Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Colaborador</label>
              <select
                value={form.colaborador_id}
                onChange={e => setForm(f => ({ ...f, colaborador_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Nenhum —</option>
                {colaboradores.filter(c => c.ativo).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fornecedor</label>
              <select
                value={form.fornecedor_id}
                onChange={e => setForm(f => ({ ...f, fornecedor_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Nenhum —</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <Input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o lançamento..."
              className="text-sm h-9"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Competência <span className="text-red-500">*</span></label>
              <Input
                value={form.data_competencia.slice(0, 7)}
                onChange={e => setForm(f => ({ ...f, data_competencia: e.target.value + "-01" }))}
                type="month"
                className="text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vencimento</label>
              <Input
                value={form.data_vencimento}
                onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                type="date"
                className="text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pagamento</label>
              <Input
                value={form.data_pagamento}
                onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))}
                type="date"
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, status: key as any }))}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    form.status === key ? cn(cfg.bg, cfg.color, "border-current") : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recorrência */}
          <div className="rounded-lg border border-border/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Lançamento Recorrente</p>
                <p className="text-[11px] text-muted-foreground">Repete automaticamente na frequência definida</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, recorrente: !f.recorrente }))}
                className={cn(
                  "relative w-10 h-5.5 rounded-full transition-colors shrink-0",
                  form.recorrente ? "bg-[#164B6E]" : "bg-muted"
                )}
                style={{ height: 22, width: 40 }}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform",
                  form.recorrente ? "translate-x-[18px]" : "translate-x-0"
                )} style={{ width: 18, height: 18 }} />
              </button>
            </div>
            {form.recorrente && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frequência</label>
                <select
                  value={form.frequencia}
                  onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.entries(FREQUENCIAS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Notas adicionais..."
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1 h-9 bg-[#164B6E] hover:bg-[#164B6E]/90" onClick={salvar} disabled={salvando}>
            {salvando ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal colaborador ────────────────────────────────────────────────────────
function ModalColaborador({
  colaborador, onClose, onSaved,
}: {
  colaborador: Partial<Colaborador> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!colaborador?.id;
  const [form, setForm] = useState({
    nome:                         colaborador?.nome ?? "",
    cargo:                        colaborador?.cargo ?? "",
    tipo:                         (colaborador?.tipo ?? "colaborador") as "gestor" | "colaborador",
    gestao:                       colaborador?.gestao ?? "",
    percentual_vendas_proprias:   colaborador?.percentual_vendas_proprias?.toString() ?? "0",
    percentual_todas_vendas:      colaborador?.percentual_todas_vendas?.toString() ?? "0",
    valor_fixo:                   colaborador?.valor_fixo?.toString() ?? "0",
    ativo:                        colaborador?.ativo ?? true,
  });
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim(),
      cargo: form.cargo || null,
      tipo: form.tipo,
      gestao: form.gestao || null,
      percentual_vendas_proprias: parseFloat(form.percentual_vendas_proprias) || 0,
      percentual_todas_vendas:    parseFloat(form.percentual_todas_vendas) || 0,
      valor_fixo:                 parseFloat(form.valor_fixo) || 0,
      ativo: form.ativo,
    };
    const { error } = isEdit
      ? await supabase.from("colaboradores").update(payload).eq("id", colaborador!.id!)
      : await supabase.from("colaboradores").insert(payload);
    if (error) { toast.error("Erro ao salvar"); }
    else { toast.success(isEdit ? "Colaborador atualizado" : "Colaborador cadastrado"); onSaved(); onClose(); }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
              <Users size={15} className="text-white" />
            </div>
            <h2 className="font-semibold text-sm">{isEdit ? "Editar Colaborador" : "Novo Colaborador"}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome <span className="text-red-500">*</span></label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" className="text-sm h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cargo</label>
              <Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Gestor, Diretor" className="text-sm h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any, gestao: "" }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9"
              >
                <option value="gestor">Gestor</option>
                <option value="colaborador">Colaborador</option>
              </select>
            </div>
            {form.tipo === "gestor" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gestão</label>
                <select
                  value={form.gestao}
                  onChange={e => setForm(f => ({ ...f, gestao: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9"
                >
                  <option value="">— Selecione —</option>
                  <option value="G1">G1 — Gestão 1</option>
                  <option value="G4">G4 — Gestão 4</option>
                  <option value="ADM">ADM — Administrativo</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-muted/40 rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Regras de Comissão</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">% Vendas próprias</label>
                <Input
                  value={form.percentual_vendas_proprias}
                  onChange={e => setForm(f => ({ ...f, percentual_vendas_proprias: e.target.value }))}
                  type="number" step="0.01" className="text-sm h-8"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Sobre suas vendas</p>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">% Todas vendas</label>
                <Input
                  value={form.percentual_todas_vendas}
                  onChange={e => setForm(f => ({ ...f, percentual_todas_vendas: e.target.value }))}
                  type="number" step="0.01" className="text-sm h-8"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Sobre tudo (ex: diretor)</p>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Fixo mensal R$</label>
                <Input
                  value={form.valor_fixo}
                  onChange={e => setForm(f => ({ ...f, valor_fixo: e.target.value }))}
                  type="number" step="0.01" className="text-sm h-8"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Base fixa (se houver)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="ativo" className="text-sm font-medium">Ativo</label>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/30">
          <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1 h-9 bg-[#164B6E] hover:bg-[#164B6E]/90" onClick={salvar} disabled={salvando}>
            {salvando ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de categoria ───────────────────────────────────────────────────────
function ModalCategoria({
  categoria, onClose, onSaved,
}: {
  categoria: Partial<CategoriaFinanceira> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!categoria?.id;
  const [form, setForm] = useState({
    nome:           categoria?.nome ?? "",
    tipo:           (categoria?.tipo ?? "entrada") as "entrada" | "saida",
    cor:            categoria?.cor ?? "#164B6E",
    descricao:      categoria?.descricao ?? "",
    ativo:          categoria?.ativo ?? true,
    // recorrência
    tem_recorrencia: false,
    valor:          "",
    frequencia:     "mensal",
    dia_vencimento: "1",
    data_inicio:    new Date().toISOString().slice(0, 7) + "-01",
  });
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome da categoria"); return; }
    setSalvando(true);

    const payload = {
      nome:      form.nome.trim(),
      tipo:      form.tipo,
      cor:       form.cor,
      descricao: form.descricao || null,
      ativo:     form.ativo,
    };

    let catId: string | null = categoria?.id ?? null;

    const { data: catData, error: catError } = isEdit
      ? await (supabase.from("categorias_financeiras").update(payload).eq("id", categoria!.id!).select("id").single())
      : await (supabase.from("categorias_financeiras").insert(payload).select("id").single());

    if (catError || !catData) {
      toast.error("Erro ao salvar categoria");
      setSalvando(false);
      return;
    }
    catId = catData.id;

    // Se tem recorrência e é criação nova → gera lançamento recorrente
    if (!isEdit && form.tem_recorrencia) {
      const valor = parseFloat(form.valor);
      if (!isNaN(valor) && valor > 0) {
        await supabase.from("lancamentos_financeiros").insert({
          tipo:             form.tipo,
          categoria:        form.tipo === "entrada" ? "receita_extra" : "despesa_variavel",
          categoria_id:     catId,
          valor,
          status:           "pendente",
          data_competencia: form.data_inicio,
          recorrente:       true,
          frequencia:       form.frequencia,
          descricao:        `Recorrente: ${form.nome.trim()}`,
          observacoes:      form.descricao || null,
          origem:           "manual",
        });
      }
    }

    toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
    onSaved();
    onClose();
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.cor }}>
              <Filter size={15} className="text-white" />
            </div>
            <h2 className="font-semibold text-sm">{isEdit ? "Editar Categoria" : "Nova Categoria"}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <div className="flex gap-2">
              {(["entrada", "saida"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-xs font-medium transition-colors",
                    form.tipo === t
                      ? t === "entrada" ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t === "entrada" ? "↑ Receita" : "↓ Despesa"}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome <span className="text-red-500">*</span></label>
            <Input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Aluguel, Comissão parceiro, Serviço..."
              className="text-sm h-9"
            />
          </div>

          {/* Cor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cor</label>
            <div className="flex items-center gap-2 flex-wrap">
              {CORES_CATEGORIA.map(cor => (
                <button
                  key={cor}
                  onClick={() => setForm(f => ({ ...f, cor }))}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    form.cor === cor ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
              <input
                type="color"
                value={form.cor}
                onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                className="w-7 h-7 rounded-full cursor-pointer border border-border"
                title="Cor personalizada"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <Input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descrição opcional..."
              className="text-sm h-9"
            />
          </div>

          {/* Recorrência (só na criação) */}
          {!isEdit && (
            <div className="rounded-lg border border-border/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Criar lançamento recorrente</p>
                  <p className="text-[11px] text-muted-foreground">Já insere esta categoria nos lançamentos recorrentes</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, tem_recorrencia: !f.tem_recorrencia }))}
                  style={{ height: 22, width: 40 }}
                  className={cn("relative rounded-full transition-colors shrink-0", form.tem_recorrencia ? "bg-[#164B6E]" : "bg-muted")}
                >
                  <span
                    className={cn("absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform", form.tem_recorrencia ? "translate-x-[18px]" : "translate-x-0")}
                    style={{ width: 18, height: 18 }}
                  />
                </button>
              </div>

              {form.tem_recorrencia && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor (R$)</label>
                      <Input
                        value={form.valor}
                        onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                        type="number" step="0.01" placeholder="0,00"
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dia vencimento</label>
                      <Input
                        value={form.dia_vencimento}
                        onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))}
                        type="number" min="1" max="31" placeholder="1"
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frequência</label>
                      <select
                        value={form.frequencia}
                        onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9"
                      >
                        {Object.entries(FREQUENCIAS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Início (mês)</label>
                      <Input
                        value={form.data_inicio.slice(0, 7)}
                        onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value + "-01" }))}
                        type="month"
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ativo (só na edição) */}
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="cat_ativo"
                checked={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="cat_ativo" className="text-sm font-medium">Categoria ativa</label>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1 h-9 bg-[#164B6E] hover:bg-[#164B6E]/90" onClick={salvar} disabled={salvando}>
            {salvando ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── DRE ─────────────────────────────────────────────────────────────────────
function DrePage({ lancamentos }: { lancamentos: Lancamento[] }) {
  const anoAtual = new Date().getFullYear();
  const [periodoTipo, setPeriodoTipo] = useState<"mes" | "trimestre" | "semestre" | "ano" | "custom">("ano");
  const [anoSel, setAnoSel] = useState(anoAtual);
  const [mesSel, setMesSel] = useState(new Date().getMonth() + 1); // 1-12
  const [customDe, setCustomDe] = useState(new Date().toISOString().slice(0, 7));
  const [customAte, setCustomAte] = useState(new Date().toISOString().slice(0, 7));
  const [verMensal, setVerMensal] = useState(false);

  // Calcula range de meses do período selecionado
  const rangeMeses: string[] = (() => {
    if (periodoTipo === "mes") {
      return [`${anoSel}-${String(mesSel).padStart(2, "0")}`];
    }
    if (periodoTipo === "trimestre") {
      const inicio = Math.floor((mesSel - 1) / 3) * 3 + 1;
      return Array.from({ length: 3 }, (_, i) =>
        `${anoSel}-${String(inicio + i).padStart(2, "0")}`
      ).filter(m => parseInt(m.split("-")[1]) <= 12);
    }
    if (periodoTipo === "semestre") {
      const inicio = mesSel <= 6 ? 1 : 7;
      return Array.from({ length: 6 }, (_, i) =>
        `${anoSel}-${String(inicio + i).padStart(2, "0")}`
      );
    }
    if (periodoTipo === "ano") {
      return Array.from({ length: 12 }, (_, i) =>
        `${anoSel}-${String(i + 1).padStart(2, "0")}`
      );
    }
    // custom
    const de  = new Date(customDe  + "-01");
    const ate = new Date(customAte + "-01");
    const meses: string[] = [];
    const cur = new Date(de);
    while (cur <= ate) {
      meses.push(cur.toISOString().slice(0, 7));
      cur.setMonth(cur.getMonth() + 1);
    }
    return meses;
  })();

  // Filtra lançamentos do período e status válido (não cancelado)
  const lancsRange = lancamentos.filter(l =>
    rangeMeses.includes(l.data_competencia.slice(0, 7)) &&
    l.status !== "cancelado"
  );

  // Agrupa por categoria
  const soma = (cat: string) => lancsRange.filter(l => l.categoria === cat).reduce((a, l) => a + l.valor, 0);

  const comissaoFornecedor = soma("comissao_fornecedor");
  const receitaExtra       = soma("receita_extra");
  const receitaBruta       = comissaoFornecedor + receitaExtra;

  const comissaoGestor     = soma("comissao_gestor");
  const comissaoColab      = soma("comissao_colaborador");
  const despesaFixa        = soma("despesa_fixa");
  const despesaVariavel    = soma("despesa_variavel");
  const totalDespesas      = comissaoGestor + comissaoColab + despesaFixa + despesaVariavel;

  const resultadoLiquido   = receitaBruta - totalDespesas;
  const margem             = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : 0;

  // Dados mensais (para a tabela de evolução)
  const dadosMensais = rangeMeses.map(m => {
    const ls = lancamentos.filter(l => l.data_competencia.slice(0, 7) === m && l.status !== "cancelado");
    const rec = ls.filter(l => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
    const des = ls.filter(l => l.tipo === "saida").reduce((a, l) => a + l.valor, 0);
    return { mes: mesAno(m + "-01"), receita: rec, despesas: des, resultado: rec - des };
  });

  const labelPeriodo = (() => {
    const mNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    if (periodoTipo === "mes")      return `${mNomes[mesSel-1]}/${anoSel}`;
    if (periodoTipo === "trimestre") return `${Math.ceil(mesSel/3)}º Trim/${anoSel}`;
    if (periodoTipo === "semestre")  return `${mesSel <= 6 ? "1º" : "2º"} Sem/${anoSel}`;
    if (periodoTipo === "ano")       return `Exercício ${anoSel}`;
    return `${customDe} a ${customAte}`;
  })();

  // Linha do DRE
  const DRELinha = ({
    label, valor, destaque = false, negativo = false, indent = false, subtotal = false,
  }: {
    label: string; valor: number; destaque?: boolean; negativo?: boolean;
    indent?: boolean; subtotal?: boolean;
  }) => (
    <div className={cn(
      "flex items-center justify-between py-2 px-4",
      destaque && "font-bold bg-muted/50 rounded-lg",
      subtotal && "border-t border-border/50 mt-1 pt-3",
      indent && "pl-8"
    )}>
      <span className={cn("text-sm", indent ? "text-muted-foreground" : destaque ? "font-semibold" : "")}>
        {label}
      </span>
      <span className={cn(
        "text-sm font-mono tabular-nums",
        destaque && "text-base font-bold",
        valor < 0 || negativo
          ? "text-red-600"
          : valor > 0
            ? destaque ? "text-foreground" : "text-foreground"
            : "text-muted-foreground"
      )}>
        {negativo && valor > 0 ? "−" : ""}{formatBRL(Math.abs(valor))}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header + filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-base font-semibold font-heading">DRE — Demonstração do Resultado</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{labelPeriodo}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {/* Tipo de período */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["mes","trimestre","semestre","ano","custom"] as const).map(t => (
              <button key={t} onClick={() => setPeriodoTipo(t)}
                className={cn("px-2.5 py-1.5 transition-colors border-r border-border/50 last:border-0",
                  periodoTipo === t ? "bg-[#164B6E] text-white" : "hover:bg-muted text-muted-foreground")}>
                {t === "mes" ? "Mês" : t === "trimestre" ? "Trim." : t === "semestre" ? "Sem." : t === "ano" ? "Ano" : "Custom"}
              </button>
            ))}
          </div>

          {/* Controles do período */}
          {periodoTipo !== "custom" && (
            <>
              <select value={anoSel} onChange={e => setAnoSel(+e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8 focus-visible:outline-none">
                {[anoAtual-1, anoAtual, anoAtual+1].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {(periodoTipo === "mes" || periodoTipo === "trimestre" || periodoTipo === "semestre") && (
                <select value={mesSel} onChange={e => setMesSel(+e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-xs h-8 focus-visible:outline-none">
                  {periodoTipo === "mes"
                    ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) =>
                        <option key={i+1} value={i+1}>{m}</option>)
                    : periodoTipo === "trimestre"
                      ? [["1º Trim",1],["2º Trim",4],["3º Trim",7],["4º Trim",10]].map(([l,v]) =>
                          <option key={v as number} value={v as number}>{l}</option>)
                      : [["1º Sem",1],["2º Sem",7]].map(([l,v]) =>
                          <option key={v as number} value={v as number}>{l}</option>)
                  }
                </select>
              )}
            </>
          )}
          {periodoTipo === "custom" && (
            <>
              <Input value={customDe}  onChange={e => setCustomDe(e.target.value)}  type="month" className="h-8 text-xs w-32" />
              <span className="text-xs text-muted-foreground">até</span>
              <Input value={customAte} onChange={e => setCustomAte(e.target.value)} type="month" className="h-8 text-xs w-32" />
            </>
          )}

          <button onClick={() => setVerMensal(v => !v)}
            className={cn("px-2.5 py-1.5 rounded-md border text-xs transition-colors",
              verMensal ? "bg-[#164B6E] text-white border-[#164B6E]" : "border-border hover:bg-muted text-muted-foreground")}>
            Ver por mês
          </button>
        </div>
      </div>

      {/* DRE estruturado */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-[#164B6E] text-white px-4 py-3">
          <p className="text-sm font-bold font-heading">DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</p>
          <p className="text-[11px] opacity-80 mt-0.5">3W Hotelaria · {labelPeriodo}</p>
        </div>

        <div className="py-2">
          {/* Bloco Receitas */}
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Receitas Operacionais
            </p>
          </div>
          <DRELinha label="(+) Comissões de Fornecedores" valor={comissaoFornecedor} indent />
          <DRELinha label="(+) Receitas Extras"            valor={receitaExtra}       indent />
          <DRELinha label="= RECEITA BRUTA" valor={receitaBruta} destaque subtotal />

          {/* Bloco Despesas */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Deduções / Despesas
            </p>
          </div>
          <DRELinha label="(−) Comissões de Gestores"      valor={comissaoGestor}  indent negativo />
          <DRELinha label="(−) Comissões de Colaboradores" valor={comissaoColab}   indent negativo />
          <DRELinha label="(−) Despesas Fixas"             valor={despesaFixa}     indent negativo />
          <DRELinha label="(−) Despesas Variáveis"         valor={despesaVariavel} indent negativo />
          <DRELinha label="= TOTAL DESPESAS" valor={totalDespesas} destaque subtotal negativo />

          {/* Resultado */}
          <div className={cn(
            "mx-4 my-3 rounded-xl px-4 py-4 border-2",
            resultadoLiquido >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  = RESULTADO LÍQUIDO DO PERÍODO
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Margem: {margem.toFixed(1)}% sobre receita bruta
                </p>
              </div>
              <p className={cn(
                "text-2xl font-bold font-heading tabular-nums",
                resultadoLiquido >= 0 ? "text-emerald-700" : "text-red-600"
              )}>
                {resultadoLiquido >= 0 ? "+" : ""}{formatBRL(resultadoLiquido)}
              </p>
            </div>
            {/* Barra de margem */}
            {receitaBruta > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", resultadoLiquido >= 0 ? "bg-emerald-500" : "bg-red-500")}
                    style={{ width: `${Math.min(Math.abs(margem), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Análise rápida */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receita Bruta",    valor: receitaBruta,    cor: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Total Despesas",   valor: totalDespesas,   cor: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "Resultado",        valor: resultadoLiquido,cor: resultadoLiquido >= 0 ? "text-emerald-700" : "text-red-600", bg: resultadoLiquido >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200" },
          { label: "Margem",           valor: null,            cor: "text-[#164B6E]",   bg: "bg-[#164B6E]/5 border-[#164B6E]/20" },
        ].map(item => (
          <div key={item.label} className={cn("rounded-xl border px-4 py-3", item.bg)}>
            <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
            <p className={cn("text-lg font-bold font-heading mt-1", item.cor)}>
              {item.valor !== null ? formatBRL(item.valor) : `${margem.toFixed(1)}%`}
            </p>
          </div>
        ))}
      </div>

      {/* Evolução mensal */}
      {verMensal && rangeMeses.length > 1 && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-sm font-semibold">Evolução Mensal</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Mês","Receita","Despesas","Resultado","Margem"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-right first:text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {dadosMensais.map(d => (
                  <tr key={d.mes} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium">{d.mes}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-emerald-600">{formatBRL(d.receita)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-red-500">−{formatBRL(d.despesas)}</td>
                    <td className={cn("px-4 py-2.5 text-right text-xs font-mono font-semibold",
                      d.resultado >= 0 ? "text-emerald-700" : "text-red-600")}>
                      {d.resultado >= 0 ? "+" : ""}{formatBRL(d.resultado)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {d.receita > 0 ? `${((d.resultado / d.receita) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
                {/* Totais */}
                <tr className="bg-muted/40 font-bold">
                  <td className="px-4 py-2.5 text-xs">TOTAL</td>
                  <td className="px-4 py-2.5 text-right text-xs font-mono text-emerald-600">{formatBRL(receitaBruta)}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-mono text-red-500">−{formatBRL(totalDespesas)}</td>
                  <td className={cn("px-4 py-2.5 text-right text-xs font-mono font-bold",
                    resultadoLiquido >= 0 ? "text-emerald-700" : "text-red-600")}>
                    {resultadoLiquido >= 0 ? "+" : ""}{formatBRL(resultadoLiquido)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold">{margem.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lancsRange.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 size={40} className="mb-3 opacity-25" />
          <p className="text-sm font-medium">Sem lançamentos no período</p>
          <p className="text-xs mt-1">Crie lançamentos ou ajuste o período selecionado</p>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Financeiro() {
  const [tab, setTab] = useState("dashboard");
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros lançamentos
  const [filtroTipo, setFiltroTipo] = useState<"" | "entrada" | "saida">("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [buscaLanc, setBuscaLanc] = useState("");

  // Modais
  const [modalLancamento, setModalLancamento] = useState<Partial<Lancamento> | null | false>(false);
  const [modalCategoria, setModalCategoria] = useState<Partial<CategoriaFinanceira> | null | false>(false);
  const [editFornecedorId, setEditFornecedorId] = useState<string | null>(null);
  const [editComissao, setEditComissao] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [lancRes, colabRes, fornRes, catRes] = await Promise.all([
      supabase
        .from("lancamentos_financeiros")
        .select("*, colaborador:colaboradores(nome), fornecedor:fornecedores(nome_fantasia), orcamento:orcamentos(numero)")
        .order("data_competencia", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("colaboradores").select("*").order("nome"),
      supabase.from("fornecedores").select("id, nome_fantasia, comissao_vendas, gestao").eq("status", "ativo").order("nome_fantasia"),
      supabase.from("categorias_financeiras").select("*").order("nome"),
    ]);
    setLancamentos((lancRes.data as Lancamento[]) ?? []);
    setColaboradores((colabRes.data as Colaborador[]) ?? []);
    setFornecedores((fornRes.data as Fornecedor[]) ?? []);
    setCategorias((catRes.data as CategoriaFinanceira[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const mesRef = new Date().toISOString().slice(0, 7);
  const lancMes = lancamentos.filter(l => l.data_competencia.slice(0, 7) === mesRef);

  const receitaMes    = lancMes.filter(l => l.tipo === "entrada" && l.status === "pago").reduce((a, l) => a + l.valor, 0);
  const receitaPrev   = lancMes.filter(l => l.tipo === "entrada" && l.status !== "cancelado").reduce((a, l) => a + l.valor, 0);
  const despesasMes   = lancMes.filter(l => l.tipo === "saida"   && l.status === "pago").reduce((a, l) => a + l.valor, 0);
  const aReceber      = lancamentos.filter(l => l.tipo === "entrada" && ["pendente","confirmado"].includes(l.status)).reduce((a, l) => a + l.valor, 0);
  const aPagar        = lancamentos.filter(l => l.tipo === "saida"   && ["pendente","confirmado"].includes(l.status)).reduce((a, l) => a + l.valor, 0);

  // ── Dados gráfico barras (12 meses) ───────────────────────────────────────
  const dadosBarras = (() => {
    const meses: Record<string, { mes: string; receita: number; despesas: number }> = {};
    const agora = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      meses[key] = { mes: mesAno(key + "-01"), receita: 0, despesas: 0 };
    }
    lancamentos.forEach(l => {
      const key = l.data_competencia.slice(0, 7);
      if (!meses[key]) return;
      if (l.status === "cancelado") return;
      if (l.tipo === "entrada") meses[key].receita  += l.valor;
      else                      meses[key].despesas += l.valor;
    });
    return Object.values(meses);
  })();

  // ── Dados pizza (receita por fornecedor) ──────────────────────────────────
  const dadosPizza = (() => {
    const por: Record<string, { name: string; value: number }> = {};
    lancamentos
      .filter(l => l.tipo === "entrada" && l.status !== "cancelado" && l.fornecedor)
      .forEach(l => {
        const nome = l.fornecedor!.nome_fantasia;
        if (!por[nome]) por[nome] = { name: nome, value: 0 };
        por[nome].value += l.valor;
      });
    return Object.values(por).sort((a, b) => b.value - a.value).slice(0, 6);
  })();

  // ── Lançamentos filtrados ─────────────────────────────────────────────────
  const lancFiltrados = lancamentos.filter(l => {
    if (filtroTipo   && l.tipo   !== filtroTipo)   return false;
    if (filtroStatus && l.status !== filtroStatus) return false;
    if (filtroMes    && l.data_competencia.slice(0, 7) !== filtroMes) return false;
    if (filtroCategoria) {
      // filtra por categoria personalizada (categoria_id) ou categoria do sistema (categoria)
      const matchCustom  = l.categoria_id === filtroCategoria;
      const matchSistema = l.categoria    === filtroCategoria;
      if (!matchCustom && !matchSistema) return false;
    }
    if (buscaLanc) {
      const q = buscaLanc.toLowerCase();
      return (
        l.descricao?.toLowerCase().includes(q) ||
        l.colaborador?.nome.toLowerCase().includes(q) ||
        l.fornecedor?.nome_fantasia.toLowerCase().includes(q) ||
        l.orcamento?.numero.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  // ── Comissões por colaborador (todos os meses) ────────────────────────────
  const comissoesPorColaborador = colaboradores.map(c => {
    const lancs = lancamentos.filter(l => l.colaborador_id === c.id && l.status !== "cancelado");
    const pago  = lancs.filter(l => l.status === "pago").reduce((a, l) => a + l.valor, 0);
    const pendente = lancs.filter(l => l.status !== "pago").reduce((a, l) => a + l.valor, 0);
    return { ...c, total_pago: pago, total_pendente: pendente, total: pago + pendente };
  });

  // ── Marcar como pago ──────────────────────────────────────────────────────
  const marcarPago = async (id: string) => {
    const { error } = await supabase
      .from("lancamentos_financeiros")
      .update({ status: "pago", data_pagamento: hoje() })
      .eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success("Marcado como pago"); carregar(); }
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("lancamentos_financeiros").update({ status: "cancelado" }).eq("id", id);
    if (error) toast.error("Erro ao cancelar");
    else { toast.success("Lançamento cancelado"); carregar(); }
  };

  // ── Salvar comissão do fornecedor ─────────────────────────────────────────
  const salvarComissaoFornecedor = async (id: string) => {
    const val = parseFloat(editComissao);
    if (isNaN(val) || val < 0 || val > 100) { toast.error("Informe uma % válida (0-100)"); return; }
    const { error } = await supabase.from("fornecedores").update({ comissao_vendas: val }).eq("id", id);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Taxa salva"); setEditFornecedorId(null); carregar(); }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
            <DollarSign size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-base font-semibold">Financeiro</h1>
            <p className="text-[11px] text-muted-foreground">Controle de comissões e lançamentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={carregar} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Atualizar
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#164B6E] hover:bg-[#164B6E]/90"
            onClick={() => setModalLancamento({})}>
            <Plus size={11} /> Novo Lançamento
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-3 border-b border-border/50 bg-card shrink-0">
          <TabsList className="h-8 gap-1 bg-transparent p-0">
            {[
              { key: "dashboard",    label: "Dashboard",     icon: BarChart3 },
              { key: "lancamentos",  label: "Lançamentos",   icon: List },
              { key: "categorias",   label: "Categorias",    icon: Filter },
              { key: "dre",          label: "DRE",           icon: BarChart3 },
              { key: "config",       label: "Configurações", icon: Settings },
            ].map(t => (
              <TabsTrigger key={t.key} value={t.key}
                className="h-8 px-3 text-xs gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#164B6E] data-[state=active]:text-[#164B6E] rounded-none">
                <t.icon size={12} />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="flex-1 p-6 space-y-6 overflow-auto">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Receita do Mês (pago)"    valor={receitaMes}  icon={TrendingUp}   cor="bg-emerald-600" sub={`Previsto: ${formatBRL(receitaPrev)}`} />
            <KpiCard label="Despesas do Mês (pago)"   valor={despesasMes} icon={TrendingDown}  cor="bg-red-500"    />
            <KpiCard label="Margem Líquida"           valor={receitaMes - despesasMes} icon={DollarSign} cor="bg-[#164B6E]" sub="Receita − Despesas pagas" />
            <KpiCard label="A Receber (total)"        valor={aReceber}    icon={Clock}         cor="bg-amber-500"  sub={`A pagar: ${formatBRL(aPagar)}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico barras */}
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4">Receita vs Despesas — 12 meses</h3>
              {dadosBarras.some(d => d.receita > 0 || d.despesas > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosBarras} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="receita"  name="Receita"  fill="#059669" radius={[4,4,0,0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lançamento ainda</p>
                  <p className="text-xs mt-1">Os dados aparecerão conforme lançamentos forem criados</p>
                </div>
              )}
            </div>

            {/* Pizza fornecedores */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4">Receita por Fornecedor</h3>
              {dadosPizza.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="value" nameKey="name" paddingAngle={3}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {dadosPizza.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                  <Building2 size={36} className="mb-2 opacity-30" />
                  <p className="text-xs text-center">Dados por fornecedor<br/>aparecerão aqui</p>
                </div>
              )}
            </div>
          </div>

          {/* Comissões a pagar por colaborador */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Comissões por Colaborador</h3>
            {comissoesPorColaborador.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum colaborador cadastrado</p>
            ) : (
              <div className="space-y-2">
                {comissoesPorColaborador.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-[#164B6E]/10 flex items-center justify-center shrink-0">
                      <Users size={13} className="text-[#164B6E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{c.cargo ?? c.tipo} {c.gestao ? `· ${c.gestao}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600">{formatBRL(c.total_pago)}</p>
                      <p className="text-[11px] text-amber-600">+ {formatBRL(c.total_pendente)} pendente</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline de receita por estágio */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1">Pipeline de Comissões</h3>
            <p className="text-[11px] text-muted-foreground mb-4">Comissões esperadas com base nos lançamentos por status</p>
            <div className="flex gap-3 flex-wrap">
              {["pendente","confirmado","pago","cancelado"].map(s => {
                const cfg = STATUS_CONFIG[s];
                const total = lancamentos.filter(l => l.tipo === "entrada" && l.status === s).reduce((a, l) => a + l.valor, 0);
                return (
                  <div key={s} className={cn("flex-1 min-w-[120px] rounded-lg border px-3 py-2.5", cfg.bg)}>
                    <p className={cn("text-[11px] font-medium", cfg.color)}>{cfg.label}</p>
                    <p className="text-lg font-bold mt-0.5">{formatBRL(total)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── LANÇAMENTOS ───────────────────────────────────────────────── */}
        <TabsContent value="lancamentos" className="flex-1 flex flex-col overflow-hidden">
          {/* Filtros */}
          <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-3 items-center bg-card shrink-0">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={buscaLanc} onChange={e => setBuscaLanc(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-xs" />
            </div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8 focus-visible:outline-none">
              <option value="">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8 focus-visible:outline-none">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8 focus-visible:outline-none max-w-[160px]">
              <option value="">Todas as categorias</option>
              {categorias.filter(c => c.ativo).length > 0 && (
                <>
                  <optgroup label="Personalizadas">
                    {categorias.filter(c => c.ativo).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </optgroup>
                </>
              )}
              <optgroup label="Sistema">
                {Object.entries(CATEGORIAS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </optgroup>
            </select>
            <Input value={filtroMes} onChange={e => setFiltroMes(e.target.value)} type="month"
              className="h-8 text-xs w-36" />
            {(filtroTipo || filtroStatus || filtroMes || filtroCategoria || buscaLanc) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2"
                onClick={() => { setFiltroTipo(""); setFiltroStatus(""); setFiltroMes(""); setFiltroCategoria(""); setBuscaLanc(""); }}>
                <X size={11} className="mr-1" /> Limpar
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{lancFiltrados.length} registros</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border/50">
                <tr>
                  {["Tipo/Categoria","Descrição","Competência","Valor","Status","Origem","Ações"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">Nenhum lançamento encontrado</td></tr>
                ) : lancFiltrados.map(l => {
                  const catInfo = CATEGORIAS[l.categoria];
                  const stsCfg  = STATUS_CONFIG[l.status];
                  return (
                    <tr key={l.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                            l.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                            {l.tipo === "entrada" ? "↑" : "↓"}
                          </span>
                          <span className={cn("text-xs", catInfo?.cor)}>{catInfo?.label ?? l.categoria}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-[220px]">
                        <p className="text-xs truncate">{l.descricao ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {l.colaborador?.nome ?? l.fornecedor?.nome_fantasia ?? ""}
                          {l.orcamento?.numero ? ` · Orc. #${l.orcamento.numero}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {mesAno(l.data_competencia)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={cn("font-semibold text-sm", l.tipo === "entrada" ? "text-emerald-600" : "text-red-600")}>
                          {l.tipo === "saida" ? "−" : "+"}{formatBRL(l.valor)}
                        </span>
                        {l.percentual ? <p className="text-[10px] text-muted-foreground">{l.percentual}% de {formatBRL(l.valor_base ?? 0)}</p> : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[11px] font-medium px-2 py-1 rounded border", stsCfg?.bg, stsCfg?.color)}>
                          {stsCfg?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                          l.origem === "automatico" ? "bg-blue-50 text-blue-600" : "bg-muted text-muted-foreground")}>
                          {l.origem === "automatico" ? "Auto" : "Manual"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {l.status !== "pago" && l.status !== "cancelado" && (
                            <button onClick={() => marcarPago(l.id)} title="Marcar como pago"
                              className="w-6 h-6 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle size={13} />
                            </button>
                          )}
                          <button onClick={() => setModalLancamento(l)} title="Editar"
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Edit2 size={12} />
                          </button>
                          {l.status !== "cancelado" && (
                            <button onClick={() => excluir(l.id)} title="Cancelar"
                              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── CATEGORIAS ────────────────────────────────────────────────── */}
        <TabsContent value="categorias" className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Categorias Financeiras</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Organize receitas e despesas por categoria personalizada</p>
            </div>
            <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#164B6E] hover:bg-[#164B6E]/90"
              onClick={() => setModalCategoria({})}>
              <Plus size={11} /> Nova Categoria
            </Button>
          </div>

          {/* Receitas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-emerald-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 px-2">Receitas</span>
              <div className="h-px flex-1 bg-emerald-200" />
            </div>
            {categorias.filter(c => c.tipo === "entrada").length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma categoria de receita cadastrada</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7"
                  onClick={() => setModalCategoria({ tipo: "entrada" })}>
                  <Plus size={11} className="mr-1" /> Criar primeira categoria
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorias.filter(c => c.tipo === "entrada").map(cat => {
                  const lancsVinculados = lancamentos.filter(l => l.categoria_id === cat.id && l.status !== "cancelado");
                  const totalCat = lancsVinculados.reduce((a, l) => a + l.valor, 0);
                  const recorrentesAtivos = lancsVinculados.filter(l => l.recorrente).length;
                  return (
                    <div key={cat.id} className={cn(
                      "bg-card border border-border/50 rounded-xl p-4 transition-all hover:shadow-sm",
                      !cat.ativo && "opacity-50"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.cor + "22" }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{cat.nome}</p>
                            {cat.descricao && <p className="text-[11px] text-muted-foreground">{cat.descricao}</p>}
                          </div>
                        </div>
                        <button onClick={() => setModalCategoria(cat)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-600">{formatBRL(totalCat)}</p>
                          <p className="text-[10px] text-muted-foreground">acumulado ({lancsVinculados.length} lanç.)</p>
                        </div>
                        {recorrentesAtivos > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                            ↻ {recorrentesAtivos} recorrente{recorrentesAtivos > 1 ? "s" : ""}
                          </span>
                        )}
                        {!cat.ativo && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inativa</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Despesas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-red-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 px-2">Despesas</span>
              <div className="h-px flex-1 bg-red-200" />
            </div>
            {categorias.filter(c => c.tipo === "saida").length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma categoria de despesa cadastrada</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7"
                  onClick={() => setModalCategoria({ tipo: "saida" })}>
                  <Plus size={11} className="mr-1" /> Criar primeira categoria
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorias.filter(c => c.tipo === "saida").map(cat => {
                  const lancsVinculados = lancamentos.filter(l => l.categoria_id === cat.id && l.status !== "cancelado");
                  const totalCat = lancsVinculados.reduce((a, l) => a + l.valor, 0);
                  const recorrentesAtivos = lancsVinculados.filter(l => l.recorrente).length;
                  return (
                    <div key={cat.id} className={cn(
                      "bg-card border border-border/50 rounded-xl p-4 transition-all hover:shadow-sm",
                      !cat.ativo && "opacity-50"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.cor + "22" }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{cat.nome}</p>
                            {cat.descricao && <p className="text-[11px] text-muted-foreground">{cat.descricao}</p>}
                          </div>
                        </div>
                        <button onClick={() => setModalCategoria(cat)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-red-600">{formatBRL(totalCat)}</p>
                          <p className="text-[10px] text-muted-foreground">acumulado ({lancsVinculados.length} lanç.)</p>
                        </div>
                        {recorrentesAtivos > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                            ↻ {recorrentesAtivos} recorrente{recorrentesAtivos > 1 ? "s" : ""}
                          </span>
                        )}
                        {!cat.ativo && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inativa</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Categorias padrão do sistema */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium text-muted-foreground px-2">Categorias padrão do sistema</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(CATEGORIAS).map(([key, info]) => (
                <div key={key} className="bg-muted/30 border border-border/30 rounded-xl p-3 flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", info.tipo === "entrada" ? "bg-emerald-500" : "bg-red-500")} />
                  <div>
                    <p className="text-xs font-medium">{info.label}</p>
                    <p className={cn("text-[10px]", info.cor)}>{info.tipo === "entrada" ? "Receita" : "Despesa"} · sistema</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── CONFIGURAÇÕES ─────────────────────────────────────────────── */}
        <TabsContent value="config" className="flex-1 overflow-auto p-6 space-y-8">

          {/* Taxas por fornecedor */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Taxas de Comissão por Fornecedor</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Percentual que a 3W recebe sobre os orçamentos consolidados de cada fornecedor.
                Essas taxas são usadas para calcular automaticamente as entradas ao consolidar uma venda.
              </p>
            </div>

            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/50">
                  <tr>
                    {["Fornecedor","Gestão","Comissão (%)","Ação"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {fornecedores.map(f => (
                    <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-medium">{f.nome_fantasia}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.gestao ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {editFornecedorId === f.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editComissao}
                              onChange={e => setEditComissao(e.target.value)}
                              type="number" step="0.01" min="0" max="100"
                              className="h-7 w-24 text-xs font-mono"
                              onKeyDown={e => { if (e.key === "Enter") salvarComissaoFornecedor(f.id); if (e.key === "Escape") setEditFornecedorId(null); }}
                              autoFocus
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <button onClick={() => salvarComissaoFornecedor(f.id)}
                              className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                              <CheckCircle size={12} />
                            </button>
                            <button onClick={() => setEditFornecedorId(null)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {f.comissao_vendas != null ? (
                              <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {f.comissao_vendas}%
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle size={11} /> Não definida
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => { setEditFornecedorId(f.id); setEditComissao(f.comissao_vendas?.toString() ?? ""); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {fornecedores.some(f => f.comissao_vendas == null) && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Fornecedores sem taxa definida não gerarão lançamentos automáticos ao consolidar. Configure a % antes de consolidar vendas.
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── DRE ───────────────────────────────────────────────────────── */}
        <TabsContent value="dre" className="flex-1 overflow-auto p-6">
          <DrePage lancamentos={lancamentos} />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {modalLancamento !== false && (
        <ModalLancamento
          lancamento={modalLancamento}
          colaboradores={colaboradores}
          fornecedores={fornecedores}
          onClose={() => setModalLancamento(false)}
          onSaved={carregar}
        />
      )}
      {modalCategoria !== false && (
        <ModalCategoria
          categoria={modalCategoria}
          onClose={() => setModalCategoria(false)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}
