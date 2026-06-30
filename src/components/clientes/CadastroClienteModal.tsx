import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCidadesIBGE } from "@/hooks/useCidadesIBGE";
import ContatosClienteSection from "@/components/contatos/ContatosClienteSection";
import type { Cliente } from "@/lib/types";
import {
  X, Save, Search, Loader2, ShieldCheck, FileText, Briefcase,
  Users, TrendingUp, Clock, Lightbulb,
  CheckCircle2, Building2, Phone, Mail, MapPin, User, Pencil,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyMaskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function applyMaskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");
}

function applyMaskCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

// ─── Local types ───────────────────────────────────────────────────────────────

interface HistoricoData {
  total: number;
  pedidos: number;
  recusados: number;
  ativos: number;
  volumePedidos: number;
  recentes: Array<{
    id: string;
    numero: string;
    status: string;
    total: number;
    data_emissao: string | null;
    fornecedor_nome: string | null;
    created_at: string;
  }>;
}

interface FormState {
  pessoa_tipo: "PJ" | "PF";
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  estado: string;
  cidade: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cnpj_validado: boolean;
  inscricao_estadual_tipo: string;
  inscricao_estadual: string;
  segmento: string[];
  tipo: string;
  status: string;
  data_primeira_compra: string;
  data_ultima_compra: string;
  qtd_orcada: number;
  qtd_comprada: number;
  total_pedidos_consolidados: number;
  total_pedidos_nao_consolidados: number;
  hotel_uhs: string;
  hotel_leitos: string;
  hotel_uhs_acessiveis: string;
  hotel_leitos_acessiveis: string;
  hotel_tipo: string;
  hotel_classificacao: string;
  hotel_perfil: string;
  hotel_tem_spa: boolean | null;
  status_prospeccao: string;
  relacao_comercial: string;
}

const FORM_INICIAL: FormState = {
  pessoa_tipo: "PJ",
  cnpj: "", razao_social: "", nome_fantasia: "",
  logradouro: "", numero: "", complemento: "", bairro: "", cep: "", estado: "", cidade: "",
  email: "", telefone: "", whatsapp: "", cnpj_validado: false,
  inscricao_estadual_tipo: "sem_informacao", inscricao_estadual: "",
  segmento: [], tipo: "regular",
  status: "revisao",
  data_primeira_compra: "", data_ultima_compra: "",
  qtd_orcada: 0, qtd_comprada: 0,
  total_pedidos_consolidados: 0, total_pedidos_nao_consolidados: 0,
  hotel_uhs: "", hotel_leitos: "", hotel_uhs_acessiveis: "", hotel_leitos_acessiveis: "",
  hotel_tipo: "", hotel_classificacao: "", hotel_perfil: "", hotel_tem_spa: null,
  status_prospeccao: "cadastrado",
  relacao_comercial: "sem_historico",
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SEGMENTOS = ["Hotelaria", "Gastronomia", "Hospitalar", "Condominial", "Exportação", "Outros"] as const;

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const STATUS_OPTIONS = [
  { value: "inativo",             label: "Inativo" },
  { value: "ativo",               label: "Ativo" },
  { value: "atendimento_regular", label: "Atendimento Regular" },
  { value: "atendimento_vip",     label: "Atendimento VIP" },
];

const STATUS_PROSPECCAO_OPTIONS = [
  { value: "cadastrado",     label: "Cadastrado" },
  { value: "higienizado",    label: "Higienizado" },
  { value: "aquecido",       label: "Aquecido" },
  { value: "em_prospeccao",  label: "Em Prospecção" },
  { value: "ativo",          label: "Ativo" },
  { value: "inativo",        label: "Inativo" },
];

const RELACAO_COMERCIAL_OPTIONS = [
  { value: "sem_historico", label: "Sem Histórico" },
  { value: "orcamento",     label: "Orçamento" },
  { value: "cliente",       label: "Cliente" },
  { value: "recorrente",    label: "Recorrente" },
  { value: "suspenso",      label: "Suspenso" },
];

const HOTEL_TIPOS = [
  "Econômico", "Midscale", "Superior", "Upscale", "Upper Upscale", "Luxury",
  "All Inclusive", "Boutique", "Resort", "Hostel", "Pousada", "Apart Hotel", "Cama & Café",
];

const HOTEL_CLASSIFICACOES = [
  "Sem classificação", "1 estrela", "2 estrelas", "3 estrelas", "4 estrelas", "5 estrelas",
];

const HOTEL_PERFIS = ["Lazer", "Negócios", "Lazer e Negócios", "Trânsito", "All Inclusive"];

const TABS = [
  { id: "receita",        label: "Receita",     icon: FileText },
  { id: "comercial",      label: "Comercial",   icon: Briefcase },
  { id: "contatos",       label: "Contatos",    icon: Users },
  { id: "relacionamento", label: "Relacionam.", icon: TrendingUp },
  { id: "historico",      label: "Histórico",   icon: Clock },
  { id: "segmento",       label: "Inteligência",icon: Lightbulb },
];

// ─── Prop types ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cliente?: Cliente | null;
  segmentoInicial?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CadastroClienteModal({
  open, onClose, onSaved, cliente = null, segmentoInicial = "",
}: Props) {
  const [activeTab, setActiveTab] = useState("receita");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [historico, setHistorico] = useState<HistoricoData | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const ultimoCNPJBuscado = useRef("");

  const { cidades, loading: loadingCidades } = useCidadesIBGE(form.estado || null);
  const set = (field: keyof FormState, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ── Initialize ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (cliente) {
      setClienteId(cliente.id);
      setIsViewing(true);
      const tipoPessoa = (cliente as any).pessoa_tipo === "PF" ? "PF" : "PJ";
      setForm({
        pessoa_tipo:        tipoPessoa,
        cnpj:               tipoPessoa === "PF"
          ? applyMaskCPF(cliente.cnpj || "")
          : applyMaskCNPJ(cliente.cnpj || ""),
        razao_social:       cliente.razao_social || "",
        nome_fantasia:      cliente.nome_fantasia || "",
        logradouro:         cliente.logradouro || "",
        numero:             cliente.numero || "",
        complemento:        cliente.complemento || "",
        bairro:             cliente.bairro || "",
        cep:                applyMaskCEP(cliente.cep || ""),
        estado:             cliente.estado || "",
        cidade:             cliente.cidade || "",
        email:              cliente.email || "",
        telefone:           cliente.telefone || "",
        whatsapp:           cliente.whatsapp || "",
        cnpj_validado:      cliente.cnpj_validado || false,
        inscricao_estadual_tipo: cliente.inscricao_estadual_tipo || "sem_informacao",
        inscricao_estadual: cliente.inscricao_estadual || "",
        segmento:           cliente.segmento || [],
        tipo:               cliente.tipo || "regular",
        status:             cliente.status || "ativo",
        data_primeira_compra: cliente.data_primeira_compra || "",
        data_ultima_compra:   cliente.data_ultima_compra || "",
        qtd_orcada:         cliente.qtd_orcada || 0,
        qtd_comprada:       cliente.qtd_comprada || 0,
        total_pedidos_consolidados:     cliente.total_pedidos_consolidados || 0,
        total_pedidos_nao_consolidados: cliente.total_pedidos_nao_consolidados || 0,
        hotel_uhs:             String(cliente.hotel_uhs || ""),
        hotel_leitos:          String(cliente.hotel_leitos || ""),
        hotel_uhs_acessiveis:  String(cliente.hotel_uhs_acessiveis || ""),
        hotel_leitos_acessiveis: String(cliente.hotel_leitos_acessiveis || ""),
        hotel_tipo:            cliente.hotel_tipo || "",
        hotel_classificacao:   cliente.hotel_classificacao || "",
        hotel_perfil:          cliente.hotel_perfil || "",
        hotel_tem_spa:         cliente.hotel_tem_spa ?? null,
        status_prospeccao:     cliente.status_prospeccao || "cadastrado",
        relacao_comercial:     cliente.relacao_comercial || "sem_historico",
      });
      loadHistorico(cliente.id);
    } else {
      setClienteId(null);
      setIsViewing(false);
      setForm({ ...FORM_INICIAL, segmento: segmentoInicial ? [segmentoInicial] : [] });
      setHistorico(null);
    }
    setActiveTab("receita");
    ultimoCNPJBuscado.current = "";
  }, [open, cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-busca CNPJ (somente PJ) ────────────────────────────────────────────
  useEffect(() => {
    if (form.pessoa_tipo === "PF") return;
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length === 14 && digits !== ultimoCNPJBuscado.current && !form.cnpj_validado) {
      ultimoCNPJBuscado.current = digits;
      buscarCNPJ(digits, false);
    }
  }, [form.cnpj, form.pessoa_tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const buscarCNPJ = async (cnpj: string, marcarValidado: boolean) => {
    setValidating(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("Não encontrado");
      const d = await res.json();
      const patch: Partial<FormState> = {
        razao_social:  d.razao_social  || undefined,
        nome_fantasia: d.nome_fantasia || d.razao_social || undefined,
        email:         d.email ? d.email.toLowerCase() : undefined,
        telefone:      d.telefone || undefined,
        cep:           d.cep ? applyMaskCEP(d.cep) : undefined,
        bairro:        d.bairro || undefined,
        complemento:   d.complemento || undefined,
        logradouro:    d.logradouro || undefined,
        numero:        d.numero || undefined,
        estado:        d.uf ? d.uf.toUpperCase() : undefined,
        cidade:        d.municipio || undefined,
      };
      if (marcarValidado) patch.cnpj_validado = true;
      setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) }));
      if (marcarValidado) {
        const fullForm: FormState = { ...form, ...patch, cnpj_validado: true };
        await salvarReceitaInternal(fullForm, true);
        toast.success("CNPJ validado com sucesso! Dados atualizados.");
      } else {
        toast.success("Dados encontrados na Receita Federal!");
      }
    } catch {
      if (marcarValidado) toast.error("Não foi possível validar o CNPJ.");
      else toast.info("CNPJ não encontrado. Preencha os dados manualmente.");
    } finally {
      setValidating(false);
    }
  };

  // ── Load helpers ─────────────────────────────────────────────────────────────
  const loadHistorico = async (id: string) => {
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("orcamentos")
      .select("id, numero, status, total, data_emissao, fornecedor_nome, created_at")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setHistorico({
        total:        data.length,
        pedidos:      data.filter(o => o.status === "aprovado").length,
        recusados:    data.filter(o => o.status === "rejeitado").length,
        ativos:       data.filter(o => o.status === "enviado").length,
        volumePedidos: data.filter(o => o.status === "aprovado").reduce((s, o) => s + (o.total || 0), 0),
        recentes:     data as any[],
      });
    }
    setLoadingHistorico(false);
  };

  // ── Save: Aba 1 ──────────────────────────────────────────────────────────────
  const salvarReceitaInternal = async (f: FormState, validado?: boolean) => {
    const payload: Record<string, any> = {
      pessoa_tipo:   f.pessoa_tipo,
      cnpj:          f.cnpj.replace(/\D/g, ""),
      razao_social:  f.razao_social,
      nome_fantasia: f.nome_fantasia,
      logradouro:    f.logradouro || null,
      numero:        f.numero || null,
      complemento:   f.complemento || null,
      bairro:        f.bairro || null,
      cep:           f.cep.replace(/\D/g, "") || null,
      estado:        f.estado || null,
      cidade:        f.cidade || null,
      email:         f.email || null,
      telefone:      f.telefone || null,
      whatsapp:      f.whatsapp || null,
      cnpj_validado: validado ?? f.cnpj_validado,
    };
    if (clienteId) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", clienteId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...payload, status: "revisao", tipo: "regular", segmento: f.segmento.length ? f.segmento : null })
        .select("id")
        .single();
      if (error) throw error;
      setClienteId(data.id);
    }
  };

  const salvarReceita = async () => {
    const docDigits = form.cnpj.replace(/\D/g, "");
    const isPF = form.pessoa_tipo === "PF";
    if (isPF) {
      if (docDigits.length !== 11) { toast.error("CPF inválido — deve ter 11 dígitos"); return; }
      if (!form.razao_social) { toast.error("Preencha o Nome Completo"); return; }
      if (!form.nome_fantasia) { toast.error("Preencha o Nome / Apelido"); return; }
    } else {
      if (!form.cnpj || !form.razao_social || !form.nome_fantasia) {
        toast.error("Preencha CNPJ, Razão Social e Nome Fantasia");
        return;
      }
    }
    setSaving(true);
    try {
      await salvarReceitaInternal(form);
      toast.success("Dados da Receita salvos!");
      onSaved();
    } catch (err: any) {
      const isDup = err?.message?.includes("clientes_cnpj_key") || err?.code === "23505";
      toast.error(isDup ? "CNPJ já cadastrado" : `Erro ao salvar: ${err?.message}`);
    }
    setSaving(false);
  };

  // ── Save: Aba 2 ──────────────────────────────────────────────────────────────
  const salvarComercial = async () => {
    if (!clienteId) { toast.error("Salve os Dados da Receita primeiro"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("clientes").update({
        inscricao_estadual_tipo: form.inscricao_estadual_tipo,
        inscricao_estadual: form.inscricao_estadual_tipo === "numero" ? form.inscricao_estadual : null,
        segmento: form.segmento.length ? form.segmento : null,
        tipo: form.tipo,
      }).eq("id", clienteId);
      if (error) throw error;
      toast.success("Dados comerciais salvos!");
      onSaved();
    } catch (err: any) { toast.error(`Erro ao salvar: ${err?.message}`); }
    setSaving(false);
  };

  // ── Save: Aba 4 ──────────────────────────────────────────────────────────────
  const salvarRelacionamento = async () => {
    if (!clienteId) { toast.error("Salve os Dados da Receita primeiro"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("clientes").update({
        status:                         form.status,
        status_prospeccao:              form.status_prospeccao || "cadastrado",
        relacao_comercial:              form.relacao_comercial || "sem_historico",
        data_primeira_compra:           form.data_primeira_compra || null,
        data_ultima_compra:             form.data_ultima_compra || null,
        qtd_orcada:                     form.qtd_orcada || 0,
        qtd_comprada:                   form.qtd_comprada || 0,
        total_pedidos_consolidados:     form.total_pedidos_consolidados || 0,
        total_pedidos_nao_consolidados: form.total_pedidos_nao_consolidados || 0,
      }).eq("id", clienteId);
      if (error) throw error;
      toast.success("Dados de relacionamento salvos!");
      onSaved();
    } catch (err: any) { toast.error(`Erro ao salvar: ${err?.message}`); }
    setSaving(false);
  };

  // ── Save: Aba 6 ──────────────────────────────────────────────────────────────
  const salvarSegmento = async () => {
    if (!clienteId) { toast.error("Salve os Dados da Receita primeiro"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("clientes").update({
        hotel_uhs:              form.hotel_uhs ? parseInt(form.hotel_uhs) : null,
        hotel_leitos:           form.hotel_leitos ? parseInt(form.hotel_leitos) : null,
        hotel_uhs_acessiveis:   form.hotel_uhs_acessiveis ? parseInt(form.hotel_uhs_acessiveis) : null,
        hotel_leitos_acessiveis: form.hotel_leitos_acessiveis ? parseInt(form.hotel_leitos_acessiveis) : null,
        hotel_tipo:             form.hotel_tipo || null,
        hotel_classificacao:    form.hotel_classificacao || null,
        hotel_perfil:           form.hotel_perfil || null,
        hotel_tem_spa:          form.hotel_tem_spa,
      }).eq("id", clienteId);
      if (error) throw error;
      toast.success("Dados de inteligência salvos!");
      onSaved();
    } catch (err: any) { toast.error(`Erro ao salvar: ${err?.message}`); }
    setSaving(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const segPrincipal = form.segmento[0] || segmentoInicial || "";

  const renderNeedsSave = () => (
    <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground p-6">
      <FileText size={32} className="mb-3 opacity-30" />
      <p className="text-sm font-medium">Salve os Dados da Receita primeiro</p>
      <p className="text-xs mt-1 opacity-70">Preencha a Aba 1 e clique em Salvar para continuar</p>
      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setActiveTab("receita")}>
        <FileText size={13} /> Ir para Aba 1
      </Button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-[#164B6E] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            {form.pessoa_tipo === "PF"
              ? <User size={18} className="text-white" />
              : <Building2 size={18} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-white font-semibold text-[15px] leading-tight truncate">
              {cliente
                ? (form.nome_fantasia || cliente.nome_fantasia || "Cliente")
                : "Novo Cliente"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {segPrincipal && (
                <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0 h-4">
                  {segPrincipal}
                </Badge>
              )}
              {form.cnpj_validado && form.pessoa_tipo === "PJ" && (
                <Badge className="bg-emerald-400/30 text-emerald-100 border-0 text-[10px] px-2 py-0 h-4 gap-0.5">
                  <ShieldCheck size={9} /> Validado
                </Badge>
              )}
              {form.pessoa_tipo === "PF" && (
                <Badge className="bg-amber-400/30 text-amber-100 border-0 text-[10px] px-2 py-0 h-4 gap-0.5">
                  <User size={9} /> Pessoa Física
                </Badge>
              )}
              {isViewing && clienteId && (
                <Badge className="bg-white/10 text-white/70 border-0 text-[10px] px-2 py-0 h-4">
                  Visualizando
                </Badge>
              )}
            </div>
          </div>

          {/* Toggle PJ / PF — só disponível em novo cadastro */}
          {!clienteId && !isViewing && (
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 shrink-0">
              {(["PJ", "PF"] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => {
                    set("pessoa_tipo", tipo);
                    set("cnpj", "");
                    set("razao_social", "");
                    set("nome_fantasia", "");
                    set("cnpj_validado", false);
                    ultimoCNPJBuscado.current = "";
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                    form.pessoa_tipo === tipo
                      ? "bg-white text-[#164B6E]"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                </button>
              ))}
            </div>
          )}

          {/* Botão Editar / Cancelar edição */}
          {clienteId && (
            isViewing ? (
              <button
                onClick={() => setIsViewing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/25 hover:bg-white/15 text-white text-xs font-medium transition-colors shrink-0"
              >
                <Pencil size={12} /> Editar
              </button>
            ) : (
              <button
                onClick={() => setIsViewing(true)}
                className="text-white/50 hover:text-white/80 text-xs transition-colors shrink-0"
              >
                Cancelar
              </button>
            )
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab bar — grid 6 colunas, sem scroll ── */}
        <div className="grid grid-cols-6 border-b bg-card shrink-0">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLocked = tab.id !== "receita" && !clienteId;
            return (
              <button
                key={tab.id}
                onClick={() => !isLocked && setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 px-1 border-b-2 transition-colors",
                  isActive
                    ? "border-[#164B6E] text-[#164B6E] bg-[#164B6E]/5"
                    : isLocked
                      ? "border-transparent text-muted-foreground/30 cursor-not-allowed"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
                )}
              >
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                    isActive
                      ? "bg-[#164B6E] text-white"
                      : isLocked
                        ? "bg-muted text-muted-foreground/30"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </span>
                  <Icon size={12} className="shrink-0" />
                </div>
                <span className="text-[10px] font-medium leading-tight text-center truncate w-full px-1">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ════ ABA 1: RECEITA FEDERAL ════ */}
          {activeTab === "receita" && (
            <div className="p-6 space-y-5">
              <div className={cn(isViewing && "pointer-events-none opacity-60")}>

                {form.pessoa_tipo === "PJ" ? (
                  <>
                    {/* CNPJ + Razão Social (PJ) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          CNPJ <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={form.cnpj}
                            onChange={e => set("cnpj", applyMaskCNPJ(e.target.value))}
                            placeholder="00.000.000/0000-00"
                            className="font-mono"
                            disabled={form.cnpj_validado}
                            maxLength={18}
                          />
                          {form.cnpj_validado && (
                            <div className="w-9 flex items-center justify-center text-emerald-600 shrink-0">
                              <ShieldCheck size={18} />
                            </div>
                          )}
                        </div>
                        {validating && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" />
                            Consultando Receita Federal…
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Razão Social <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={form.razao_social}
                          onChange={e => set("razao_social", e.target.value)}
                          disabled={form.cnpj_validado}
                        />
                      </div>
                    </div>
                    {/* Nome Fantasia (PJ) */}
                    <div className="space-y-1.5 mt-4">
                      <Label className="text-xs font-medium">
                        Nome Fantasia <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.nome_fantasia}
                        onChange={e => set("nome_fantasia", e.target.value)}
                        placeholder="Como o cliente é conhecido no mercado"
                        disabled={form.cnpj_validado}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* CPF + Nome Completo (PF) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          CPF <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={form.cnpj}
                          onChange={e => set("cnpj", applyMaskCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          className="font-mono"
                          maxLength={14}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Nome Completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={form.razao_social}
                          onChange={e => set("razao_social", e.target.value)}
                          placeholder="Nome completo da pessoa"
                        />
                      </div>
                    </div>
                    {/* Nome / Apelido (PF) */}
                    <div className="space-y-1.5 mt-4">
                      <Label className="text-xs font-medium">
                        Nome / Apelido <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.nome_fantasia}
                        onChange={e => set("nome_fantasia", e.target.value)}
                        placeholder="Como é conhecido — usado para identificar no sistema"
                      />
                    </div>
                  </>
                )}

                {/* Endereço */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <MapPin size={11} /> Endereço
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Logradouro (Rua / Av.)</Label>
                      <Input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} placeholder="Rua das Flores" disabled={form.cnpj_validado} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Número</Label>
                      <Input value={form.numero} onChange={e => set("numero", e.target.value)} placeholder="123" disabled={form.cnpj_validado} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Complemento</Label>
                      <Input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Sala 2, Apto 42" disabled={form.cnpj_validado} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={form.bairro} onChange={e => set("bairro", e.target.value)} disabled={form.cnpj_validado} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CEP</Label>
                      <Input value={form.cep} onChange={e => set("cep", applyMaskCEP(e.target.value))} placeholder="00000-000" maxLength={9} disabled={form.cnpj_validado} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Estado</Label>
                      <Select value={form.estado} onValueChange={v => { set("estado", v); set("cidade", ""); }} disabled={form.cnpj_validado}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent className="bg-card z-[100] max-h-60">
                          {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade</Label>
                      <Select value={form.cidade} onValueChange={v => set("cidade", v)} disabled={form.cnpj_validado || !form.estado || loadingCidades}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={
                            !form.estado ? "Selecione o estado primeiro" :
                            loadingCidades ? "Carregando…" : "Selecione a cidade"
                          } />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-[100] max-h-60">
                          {cidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contato principal */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Phone size={11} /> Contato Principal
                  </p>
                  {form.cnpj_validado && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mb-3 flex items-center gap-1.5">
                      <ShieldCheck size={12} className="shrink-0" />
                      Dados validados pela Receita Federal — invioláveis. Não podem ser editados aqui nem por importação.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Mail size={11} /> E-mail</Label>
                      <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contato@empresa.com" disabled={form.cnpj_validado} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone size={11} /> Telefone</Label>
                      <Input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 3333-4444" disabled={form.cnpj_validado} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" disabled={form.cnpj_validado} />
                    </div>
                  </div>
                </div>

              </div>{/* end pointer-events wrapper */}

              {/* Botões — só no modo edição */}
              {!isViewing && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  {form.pessoa_tipo === "PJ" && (
                    <Button
                      variant="outline"
                      className={cn(
                        "gap-1.5",
                        form.cnpj_validado
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 opacity-100 disabled:opacity-100"
                          : "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      )}
                      onClick={() => buscarCNPJ(form.cnpj.replace(/\D/g, ""), true)}
                      disabled={saving || validating || form.cnpj_validado || form.cnpj.replace(/\D/g, "").length !== 14}
                    >
                      {validating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {form.cnpj_validado ? "Validado" : validating ? "Validando…" : "Validar"}
                    </Button>
                  )}
                  <Button
                    onClick={salvarReceita}
                    className="gap-1.5 bg-[#164B6E] hover:bg-[#1a5a84] text-white ml-auto"
                    disabled={saving || validating}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════ ABA 2: DADOS COMERCIAIS ════ */}
          {activeTab === "comercial" && (!clienteId ? renderNeedsSave() : (
            <div className="p-6 space-y-6">
              <div className={cn(isViewing && "pointer-events-none opacity-60")}>

                {/* Inscrição Estadual */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Inscrição Estadual
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "isento",        label: "Isento" },
                      { value: "sem_informacao", label: "Sem Informação" },
                      { value: "numero",         label: "Número" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("inscricao_estadual_tipo", opt.value)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                          form.inscricao_estadual_tipo === opt.value
                            ? "border-[#164B6E] bg-[#164B6E]/5 text-[#164B6E]"
                            : "border-border hover:border-[#164B6E]/40 text-muted-foreground"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full border-2", form.inscricao_estadual_tipo === opt.value ? "border-[#164B6E] bg-[#164B6E]" : "border-muted-foreground")} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.inscricao_estadual_tipo === "numero" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Número da Inscrição Estadual</Label>
                      <Input
                        value={form.inscricao_estadual}
                        onChange={e => set("inscricao_estadual", e.target.value)}
                        placeholder="000.000.000.000"
                        className="font-mono max-w-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Segmento */}
                <div className="space-y-3 mt-6">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Segmento</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SEGMENTOS.map(seg => (
                      <label
                        key={seg}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all select-none",
                          form.segmento.includes(seg)
                            ? "border-[#164B6E] bg-[#164B6E]/5"
                            : "border-border hover:border-[#164B6E]/40"
                        )}
                      >
                        <Checkbox
                          checked={form.segmento.includes(seg)}
                          onCheckedChange={() => {
                            const cur = form.segmento;
                            set("segmento", cur.includes(seg) ? cur.filter(s => s !== seg) : [...cur, seg]);
                          }}
                        />
                        <span className="text-sm font-medium">{seg}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tipo */}
                <div className="space-y-3 mt-6">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tipo de Cliente</Label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    {[
                      { value: "regular", label: "Regular", desc: "Cliente padrão da base" },
                      { value: "vip",     label: "VIP",     desc: "Atendimento diferenciado" },
                    ].map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set("tipo", t.value)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                          form.tipo === t.value ? "border-[#164B6E] bg-[#164B6E]/5" : "border-border hover:border-[#164B6E]/40"
                        )}
                      >
                        <div className={cn("w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors", form.tipo === t.value ? "border-[#164B6E] bg-[#164B6E]" : "border-muted-foreground")} />
                        <div>
                          <p className="font-semibold text-sm">{t.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>{/* end pointer-events wrapper */}

              {!isViewing && (
                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={salvarComercial} className="gap-1.5 bg-[#164B6E] hover:bg-[#1a5a84] text-white" disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* ════ ABA 3: CONTATOS ════ */}
          {activeTab === "contatos" && (!clienteId ? renderNeedsSave() : (
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold">Contatos da Empresa</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pessoas vinculadas a este cliente — gerenciadas no módulo Contatos</p>
              </div>
              <ContatosClienteSection
                clienteId={clienteId}
                clienteNome={form.nome_fantasia}
                clienteCnpj={form.cnpj}
              />
            </div>
          ))}

          {/* ════ ABA 4: RELACIONAMENTO ════ */}
          {activeTab === "relacionamento" && (!clienteId ? renderNeedsSave() : (
            <div className="p-6 space-y-6">
              <div className={cn(isViewing && "pointer-events-none opacity-60")}>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status do Cliente</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => set("status", s.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                          form.status === s.value
                            ? "border-[#164B6E] bg-[#164B6E]/5 text-[#164B6E]"
                            : "border-border hover:border-[#164B6E]/40 text-muted-foreground"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", form.status === s.value ? "border-[#164B6E] bg-[#164B6E]" : "border-muted-foreground")} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status de Prospecção</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_PROSPECCAO_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => set("status_prospeccao", s.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                          form.status_prospeccao === s.value
                            ? "border-[#164B6E] bg-[#164B6E]/5 text-[#164B6E]"
                            : "border-border hover:border-[#164B6E]/40 text-muted-foreground"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", form.status_prospeccao === s.value ? "border-[#164B6E] bg-[#164B6E]" : "border-muted-foreground")} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Relação Comercial</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {RELACAO_COMERCIAL_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => set("relacao_comercial", s.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                          form.relacao_comercial === s.value
                            ? "border-[#164B6E] bg-[#164B6E]/5 text-[#164B6E]"
                            : "border-border hover:border-[#164B6E]/40 text-muted-foreground"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", form.relacao_comercial === s.value ? "border-[#164B6E] bg-[#164B6E]" : "border-muted-foreground")} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Histórico de Compras</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade Orçada</Label>
                      <Input type="number" min={0} value={form.qtd_orcada} onChange={e => set("qtd_orcada", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade Comprada</Label>
                      <Input type="number" min={0} value={form.qtd_comprada} onChange={e => set("qtd_comprada", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data da Primeira Compra</Label>
                      <Input type="date" value={form.data_primeira_compra} onChange={e => set("data_primeira_compra", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data da Última Compra</Label>
                      <Input type="date" value={form.data_ultima_compra} onChange={e => set("data_ultima_compra", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Total de Pedidos Consolidados (R$)</Label>
                      <Input type="number" min={0} step={0.01} value={form.total_pedidos_consolidados} onChange={e => set("total_pedidos_consolidados", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Total de Pedidos Não Consolidados (R$)</Label>
                      <Input type="number" min={0} step={0.01} value={form.total_pedidos_nao_consolidados} onChange={e => set("total_pedidos_nao_consolidados", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

              </div>{/* end pointer-events wrapper */}

              {!isViewing && (
                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={salvarRelacionamento} className="gap-1.5 bg-[#164B6E] hover:bg-[#1a5a84] text-white" disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* ════ ABA 5: HISTÓRICO COM FORNECEDORES ════ */}
          {activeTab === "historico" && (!clienteId ? renderNeedsSave() : (
            <div className="p-6 space-y-5">
              {loadingHistorico ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : !historico || historico.total === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <Clock size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Sem Histórico</p>
                  <p className="text-xs mt-1 opacity-70 max-w-xs">Nenhum orçamento ou pedido registrado para este cliente</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Cliente Recorrente</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {historico.total} interaç{historico.total === 1 ? "ão" : "ões"} registrada{historico.total !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Orçamentos",  value: historico.total,     color: "bg-blue-50 border-blue-200 text-blue-700" },
                      { label: "Pedidos",     value: historico.pedidos,   color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                      { label: "Recusados",   value: historico.recusados, color: "bg-red-50 border-red-200 text-red-700" },
                      { label: "Orç. Ativos", value: historico.ativos,    color: "bg-amber-50 border-amber-200 text-amber-700" },
                    ].map(stat => (
                      <div key={stat.label} className={cn("rounded-xl border p-4 text-center", stat.color)}>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs font-medium mt-1 opacity-80">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {historico.volumePedidos > 0 && (
                    <div className="rounded-xl bg-[#164B6E]/5 border border-[#164B6E]/20 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#164B6E]">
                        <TrendingUp size={16} />
                        <span className="text-sm font-medium">Volume Total — Pedidos Aprovados</span>
                      </div>
                      <span className="font-bold text-[#164B6E] text-lg">
                        {historico.volumePedidos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Últimos Registros</p>
                    <div className="space-y-1.5">
                      {historico.recentes.slice(0, 8).map(orc => {
                        const statusMap: Record<string, { label: string; cls: string }> = {
                          rascunho:  { label: "Rascunho", cls: "bg-slate-100 text-slate-600" },
                          enviado:   { label: "Ativo",    cls: "bg-amber-100 text-amber-700" },
                          aprovado:  { label: "Pedido",   cls: "bg-emerald-100 text-emerald-700" },
                          rejeitado: { label: "Recusado", cls: "bg-red-100 text-red-700" },
                          expirado:  { label: "Expirado", cls: "bg-slate-100 text-slate-500" },
                        };
                        const s = statusMap[orc.status] || { label: orc.status, cls: "bg-slate-100 text-slate-600" };
                        return (
                          <div key={orc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors text-sm">
                            <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{orc.numero}</span>
                            <Badge variant="outline" className={cn("text-[10px] px-2 h-5 shrink-0", s.cls)}>{s.label}</Badge>
                            <span className="text-xs text-muted-foreground flex-1 truncate">{orc.fornecedor_nome || "—"}</span>
                            <span className="text-xs font-medium tabular-nums shrink-0">
                              {orc.total ? orc.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {orc.data_emissao ? new Date(orc.data_emissao).toLocaleDateString("pt-BR") : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => clienteId && loadHistorico(clienteId)} disabled={loadingHistorico}>
                      <Loader2 size={12} className={loadingHistorico ? "animate-spin" : ""} />
                      Atualizar
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* ════ ABA 6: INTELIGÊNCIA DO SEGMENTO ════ */}
          {activeTab === "segmento" && (!clienteId ? renderNeedsSave() : (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Lightbulb size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Dados de Inteligência — {segPrincipal || "Segmento"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Informações específicas do segmento para análise estratégica</p>
                </div>
              </div>

              {segPrincipal === "Hotelaria" ? (
                <>
                  <div className={cn(isViewing && "pointer-events-none opacity-60")}>

                    <div className="space-y-3">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Capacidade</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {([
                          { field: "hotel_uhs",               label: "UHs",           desc: "Unidades habitacionais" },
                          { field: "hotel_leitos",            label: "Leitos",         desc: "Total de leitos" },
                          { field: "hotel_uhs_acessiveis",    label: "UHs Acess.",     desc: "UHs para PCD" },
                          { field: "hotel_leitos_acessiveis", label: "Leitos Acess.",  desc: "Leitos para PCD" },
                        ] as const).map(({ field, label, desc }) => (
                          <div key={field} className="space-y-1.5">
                            <Label className="text-xs font-medium">{label}</Label>
                            <Input
                              type="number" min={0}
                              value={(form as any)[field]}
                              onChange={e => set(field as keyof FormState, e.target.value)}
                              className="text-center font-mono"
                              placeholder="0"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Tipo do Hotel</Label>
                        <Select value={form.hotel_tipo} onValueChange={v => set("hotel_tipo", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                          <SelectContent className="bg-card z-[100]">
                            {HOTEL_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Classificação</Label>
                        <Select value={form.hotel_classificacao} onValueChange={v => set("hotel_classificacao", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent className="bg-card z-[100]">
                            {HOTEL_CLASSIFICACOES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Perfil do Hotel</Label>
                        <Select value={form.hotel_perfil} onValueChange={v => set("hotel_perfil", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                          <SelectContent className="bg-card z-[100]">
                            {HOTEL_PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Tem SPA?</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: true,  label: "Sim" },
                            { value: false, label: "Não" },
                            { value: null,  label: "Não informado" },
                          ].map(opt => (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => set("hotel_tem_spa", opt.value)}
                              className={cn(
                                "py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                                form.hotel_tem_spa === opt.value
                                  ? "border-[#164B6E] bg-[#164B6E]/5 text-[#164B6E]"
                                  : "border-border hover:border-[#164B6E]/40 text-muted-foreground"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>{/* end pointer-events wrapper */}

                  {!isViewing && (
                    <div className="flex justify-end pt-2 border-t">
                      <Button onClick={salvarSegmento} className="gap-1.5 bg-[#164B6E] hover:bg-[#1a5a84] text-white" disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? "Salvando…" : "Salvar"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <Lightbulb size={32} className="mb-3 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold">Em Desenvolvimento</p>
                  <p className="text-xs mt-2 opacity-70 max-w-xs leading-relaxed">
                    Os dados de inteligência para o segmento{segPrincipal ? ` "${segPrincipal}"` : ""} estão sendo desenvolvidos e estarão disponíveis em breve.
                  </p>
                </div>
              )}
            </div>
          ))}

        </div>
      </DialogContent>
    </Dialog>
  );
}
