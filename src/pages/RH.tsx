import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Plus, Edit2, X, DollarSign, TrendingUp, Clock,
  RefreshCw, UserCheck, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface LancamentoComissao {
  id: string;
  tipo: "entrada" | "saida";
  categoria: string;
  valor: number;
  status: "pendente" | "confirmado" | "pago" | "cancelado";
  data_competencia: string;
  colaborador_id: string | null;
  fornecedor?: { nome_fantasia: string } | null;
  orcamento?: { numero: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAno(dateStr: string) {
  const [ano, mes] = dateStr.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

// ─── Modal Colaborador ────────────────────────────────────────────────────────
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
                <Input value={form.percentual_vendas_proprias} onChange={e => setForm(f => ({ ...f, percentual_vendas_proprias: e.target.value }))} type="number" step="0.01" className="text-sm h-8" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Sobre suas vendas</p>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">% Todas vendas</label>
                <Input value={form.percentual_todas_vendas} onChange={e => setForm(f => ({ ...f, percentual_todas_vendas: e.target.value }))} type="number" step="0.01" className="text-sm h-8" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Sobre tudo (ex: diretor)</p>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Fixo mensal R$</label>
                <Input value={form.valor_fixo} onChange={e => setForm(f => ({ ...f, valor_fixo: e.target.value }))} type="number" step="0.01" className="text-sm h-8" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Base fixa (se houver)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RH() {
  const [tab, setTab] = useState("colaboradores");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoComissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalColaborador, setModalColaborador] = useState<Partial<Colaborador> | null | false>(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [colabRes, lancRes] = await Promise.all([
      supabase.from("colaboradores").select("*").order("nome"),
      supabase
        .from("lancamentos_financeiros")
        .select("id, tipo, categoria, valor, status, data_competencia, colaborador_id, fornecedor:fornecedores(nome_fantasia), orcamento:orcamentos(numero)")
        .not("colaborador_id", "is", null)
        .order("data_competencia", { ascending: false })
        .limit(500),
    ]);
    setColaboradores((colabRes.data as Colaborador[]) ?? []);
    setLancamentos((lancRes.data as LancamentoComissao[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPago     = lancamentos.filter(l => l.status === "pago").reduce((a, l) => a + l.valor, 0);
  const totalPendente = lancamentos.filter(l => ["pendente","confirmado"].includes(l.status)).reduce((a, l) => a + l.valor, 0);
  const totalAtivos   = colaboradores.filter(c => c.ativo).length;

  // ── Comissões por colaborador ──────────────────────────────────────────────
  const comissoesPorColaborador = colaboradores.map(c => {
    const lancs = lancamentos.filter(l => l.colaborador_id === c.id && l.status !== "cancelado");
    const pago     = lancs.filter(l => l.status === "pago").reduce((a, l) => a + l.valor, 0);
    const pendente = lancs.filter(l => l.status !== "pago").reduce((a, l) => a + l.valor, 0);
    const porMes: Record<string, { receita: number; pago: number; pendente: number }> = {};
    lancs.forEach(l => {
      const m = l.data_competencia.slice(0, 7);
      if (!porMes[m]) porMes[m] = { receita: 0, pago: 0, pendente: 0 };
      porMes[m].receita += l.valor;
      if (l.status === "pago") porMes[m].pago     += l.valor;
      else                     porMes[m].pendente += l.valor;
    });
    return { ...c, total_pago: pago, total_pendente: pendente, total: pago + pendente, porMes };
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
            <Users size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-base font-semibold">RH</h1>
            <p className="text-[11px] text-muted-foreground">Colaboradores e comissões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={carregar} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Atualizar
          </Button>
          {tab === "colaboradores" && (
            <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#164B6E] hover:bg-[#164B6E]/90"
              onClick={() => setModalColaborador({})}>
              <Plus size={11} /> Novo Colaborador
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-card border-b border-border/50">
        <div className="bg-background border border-border/50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#164B6E] flex items-center justify-center shrink-0">
            <UserCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Colaboradores ativos</p>
            <p className="text-xl font-bold mt-0.5">{totalAtivos}</p>
            <p className="text-[11px] text-muted-foreground">{colaboradores.length} total</p>
          </div>
        </div>
        <div className="bg-background border border-border/50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total pago</p>
            <p className="text-xl font-bold mt-0.5">{formatBRL(totalPago)}</p>
            <p className="text-[11px] text-muted-foreground">em comissões</p>
          </div>
        </div>
        <div className="bg-background border border-border/50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">A pagar</p>
            <p className="text-xl font-bold mt-0.5">{formatBRL(totalPendente)}</p>
            <p className="text-[11px] text-muted-foreground">pendente</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-3 border-b border-border/50 bg-card shrink-0">
          <TabsList className="h-8 gap-1 bg-transparent p-0">
            {[
              { key: "colaboradores", label: "Colaboradores", icon: Users },
              { key: "comissoes",     label: "Comissões",     icon: Award },
            ].map(t => (
              <TabsTrigger key={t.key} value={t.key}
                className="h-8 px-3 text-xs gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#164B6E] data-[state=active]:text-[#164B6E] rounded-none">
                <t.icon size={12} />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── COLABORADORES ─────────────────────────────────────────────── */}
        <TabsContent value="colaboradores" className="flex-1 overflow-auto p-6 space-y-4">
          {colaboradores.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum colaborador cadastrado</p>
              <p className="text-xs mt-1 mb-4">Cadastre gestores e colaboradores para calcular comissões automaticamente</p>
              <Button size="sm" className="bg-[#164B6E] hover:bg-[#164B6E]/90 text-xs gap-1.5" onClick={() => setModalColaborador({})}>
                <Plus size={11} /> Cadastrar primeiro colaborador
              </Button>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/50">
                  <tr>
                    {["Colaborador","Tipo","Gestão","% Próprias","% Todas","Fixo mensal","Status",""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {colaboradores.map(c => {
                    const stats = comissoesPorColaborador.find(x => x.id === c.id);
                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#164B6E]/10 flex items-center justify-center shrink-0">
                              <Users size={13} className="text-[#164B6E]" />
                            </div>
                            <div>
                              <p className="font-medium text-xs">{c.nome}</p>
                              {c.cargo && <p className="text-[11px] text-muted-foreground">{c.cargo}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.gestao ?? "—"}</td>
                        <td className="px-4 py-3 text-xs font-mono">{c.percentual_vendas_proprias}%</td>
                        <td className="px-4 py-3 text-xs font-mono">{c.percentual_todas_vendas}%</td>
                        <td className="px-4 py-3 text-xs font-mono">{formatBRL(c.valor_fixo)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium w-fit",
                              c.ativo ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                              {c.ativo ? "Ativo" : "Inativo"}
                            </span>
                            {stats && stats.total > 0 && (
                              <span className="text-[10px] text-muted-foreground">{formatBRL(stats.total)} acum.</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setModalColaborador(c)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── COMISSÕES ─────────────────────────────────────────────────── */}
        <TabsContent value="comissoes" className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Comissões por Colaborador — Histórico</p>
          </div>

          {colaboradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhum colaborador cadastrado</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setTab("colaboradores")}>
                <Plus size={11} className="mr-1" /> Cadastrar colaborador
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {comissoesPorColaborador.map(c => {
                const mesesOrdenados = Object.entries(c.porMes).sort((a, b) => b[0].localeCompare(a[0]));
                return (
                  <div key={c.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#164B6E]/10 flex items-center justify-center shrink-0">
                          <Users size={13} className="text-[#164B6E]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{c.nome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.cargo ?? c.tipo}
                            {c.gestao ? ` · ${c.gestao}` : ""}
                            {c.percentual_vendas_proprias > 0 ? ` · ${c.percentual_vendas_proprias}% vendas próprias` : ""}
                            {c.percentual_todas_vendas > 0 ? ` · ${c.percentual_todas_vendas}% todas vendas` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatBRL(c.total)}</p>
                        <p className="text-[11px] text-muted-foreground">total acumulado</p>
                      </div>
                    </div>

                    {mesesOrdenados.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum lançamento vinculado</p>
                    ) : (
                      <div className="divide-y divide-border/20">
                        {mesesOrdenados.map(([m, dados]) => (
                          <div key={m} className="flex items-center justify-between px-4 py-2.5">
                            <p className="text-xs font-medium">{mesAno(m + "-01")}</p>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-emerald-600 font-semibold">{formatBRL(dados.pago)} pago</span>
                              {dados.pendente > 0 && <span className="text-xs text-amber-600">{formatBRL(dados.pendente)} pendente</span>}
                              <span className="text-xs font-bold">{formatBRL(dados.receita)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      {modalColaborador !== false && (
        <ModalColaborador
          colaborador={modalColaborador}
          onClose={() => setModalColaborador(false)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}
