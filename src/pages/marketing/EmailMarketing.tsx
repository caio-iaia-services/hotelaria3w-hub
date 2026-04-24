import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Mail, Plus, Send, Eye, Users, RefreshCw,
  ChevronRight, ChevronLeft, Check, Calendar,
  Filter, MoreHorizontal, Copy, Loader2,
  Tag, MapPin, Star, AlertCircle, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CampanhaStatus = "rascunho" | "agendada" | "enviando" | "enviada" | "pausada" | "cancelada"
type TipoEnvio = "imediato" | "agendado" | "recorrente"

interface Campanha {
  id: string
  nome: string
  assunto: string
  pre_header: string | null
  remetente_nome: string | null
  remetente_email: string | null
  lista_id: string | null
  conteudo_html: string | null
  template_tipo: string
  status: CampanhaStatus
  tipo_envio: TipoEnvio
  agendado_para: string | null
  total_destinatarios: number
  total_enviados: number
  total_abertos: number
  total_clicados: number
  enviado_em: string | null
  created_at: string
}

interface Lista {
  id: string
  nome: string
  descricao: string | null
  filtros: Record<string, string>
  total_contatos: number
}

interface FiltrosAudiencia {
  segmento: string
  status: string
  estado: string
  tipo: string
}

interface CampanhaForm {
  nome: string
  assunto: string
  pre_header: string
  remetente_nome: string
  remetente_email: string
  lista_id: string
  usar_lista_existente: boolean
  filtros: FiltrosAudiencia
  salvar_lista: boolean
  nome_lista: string
  template_tipo: string
  conteudo_html: string
  tipo_envio: TipoEnvio
  agendado_data: string
  agendado_hora: string
  recorrencia_frequencia: "semanal" | "mensal"
}

// ─── Configuração de status ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<CampanhaStatus, { label: string; color: string }> = {
  rascunho:  { label: "Rascunho",  color: "bg-gray-100 text-gray-600 border-gray-200" },
  agendada:  { label: "Agendada",  color: "bg-blue-50 text-blue-700 border-blue-200" },
  enviando:  { label: "Enviando",  color: "bg-amber-50 text-amber-700 border-amber-200" },
  enviada:   { label: "Enviada",   color: "bg-green-50 text-green-700 border-green-200" },
  pausada:   { label: "Pausada",   color: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelada: { label: "Cancelada", color: "bg-red-50 text-red-600 border-red-200" },
}

// ─── Templates de e-mail ──────────────────────────────────────────────────────
const TEMPLATES: Record<string, { label: string; descricao: string; html: string }> = {
  promocional: {
    label: "Promoção",
    descricao: "Oferta especial com destaque em produto",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#164B6E;padding:24px;text-align:center;">
    <h1 style="color:#C4942C;margin:0;font-size:22px;">3W HOTELARIA</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#164B6E;margin-top:0;">Oferta Especial para {{empresa}}</h2>
    <p style="color:#374151;">Olá {{nome}},</p>
    <p style="color:#374151;">Preparamos uma oferta exclusiva para você.</p>
    <p style="color:#374151;">[Descreva seu produto ou serviço aqui]</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="#" style="background:#C4942C;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Ver Oferta</a>
    </div>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;">
    <p style="color:#6B7280;font-size:12px;margin:0;">3W Hotelaria | comercial1@3whotelaria.com.br | +55 11 5197-5779</p>
  </div>
</div>`,
  },
  relacionamento: {
    label: "Relacionamento",
    descricao: "Comunicação de valor sem apelo comercial direto",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#164B6E;padding:24px;text-align:center;">
    <h1 style="color:#C4942C;margin:0;font-size:22px;">3W HOTELARIA</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#164B6E;margin-top:0;">Olá, {{nome}}!</h2>
    <p style="color:#374151;">Esperamos que esteja tudo bem com você e com a <strong>{{empresa}}</strong>.</p>
    <p style="color:#374151;">[Compartilhe uma dica, novidade ou conteúdo relevante para o setor hoteleiro]</p>
    <p style="color:#374151;">Estamos sempre à disposição para apoiar o seu negócio.</p>
    <br/>
    <p style="color:#164B6E;font-weight:bold;margin:0;">Equipe 3W Hotelaria</p>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;">
    <p style="color:#6B7280;font-size:12px;margin:0;">3W Hotelaria | comercial1@3whotelaria.com.br | +55 11 5197-5779</p>
  </div>
</div>`,
  },
  proposta: {
    label: "Proposta Comercial",
    descricao: "Apresentação formal de produtos e condições",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#164B6E;border-bottom:4px solid #C4942C;padding:24px;text-align:center;">
    <h1 style="color:#C4942C;margin:0;font-size:22px;">3W HOTELARIA</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Proposta Comercial</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#374151;">Prezado(a) <strong>{{nome}}</strong>,</p>
    <p style="color:#374151;">Segue nossa proposta comercial para a <strong>{{empresa}}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr style="background:#164B6E;">
          <th style="padding:10px 14px;color:white;text-align:left;font-size:13px;">Produto / Serviço</th>
          <th style="padding:10px 14px;color:white;text-align:right;font-size:13px;">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">[Produto 1]</td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:right;color:#374151;">R$ 0,00</td>
        </tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="#" style="background:#164B6E;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Aceitar Proposta</a>
    </div>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;">
    <p style="color:#6B7280;font-size:12px;margin:0;">3W Hotelaria | comercial1@3whotelaria.com.br | +55 11 5197-5779</p>
  </div>
</div>`,
  },
  informativo: {
    label: "Informativo",
    descricao: "Newsletter com novidades e atualizações",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#164B6E;padding:24px;text-align:center;">
    <h1 style="color:#C4942C;margin:0;font-size:22px;">3W HOTELARIA</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Informativo do Mês</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#374151;">Olá <strong>{{nome}}</strong>,</p>
    <p style="color:#374151;">Confira as novidades e atualizações deste mês:</p>
    <h3 style="color:#164B6E;border-left:4px solid #C4942C;padding-left:12px;">Novidade 1</h3>
    <p style="color:#374151;">[Descreva a novidade aqui]</p>
    <h3 style="color:#164B6E;border-left:4px solid #C4942C;padding-left:12px;">Novidade 2</h3>
    <p style="color:#374151;">[Descreva a novidade aqui]</p>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;">
    <p style="color:#6B7280;font-size:12px;margin:0;">3W Hotelaria | Para descadastrar, responda com "Descadastrar"</p>
  </div>
</div>`,
  },
  custom: {
    label: "Personalizado",
    descricao: "Escreva o conteúdo do zero em HTML",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
  <p style="color:#374151;">Olá <strong>{{nome}}</strong>,</p>
  <p style="color:#374151;">[Seu conteúdo aqui]</p>
  <p style="color:#374151;">Atenciosamente,<br/><strong style="color:#164B6E;">Equipe 3W Hotelaria</strong></p>
</div>`,
  },
}

const FORM_INICIAL: CampanhaForm = {
  nome: "",
  assunto: "",
  pre_header: "",
  remetente_nome: "3W Hotelaria",
  remetente_email: "",
  lista_id: "",
  usar_lista_existente: false,
  filtros: { segmento: "", status: "ativo", estado: "", tipo: "" },
  salvar_lista: false,
  nome_lista: "",
  template_tipo: "promocional",
  conteudo_html: TEMPLATES.promocional.html,
  tipo_envio: "imediato",
  agendado_data: "",
  agendado_hora: "09:00",
  recorrencia_frequencia: "semanal",
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EmailMarketing() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardAberto, setWizardAberto] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<CampanhaForm>(FORM_INICIAL)
  const [audienciaCount, setAudienciaCount] = useState(0)
  const [audienciaLoading, setAudienciaLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [segmentos, setSegmentos] = useState<string[]>([])
  const [estados, setEstados] = useState<string[]>([])

  useEffect(() => { carregar() }, [])

  // Recalcula audiência ao mudar filtros no step 2
  useEffect(() => {
    if (step === 2) contarAudiencia()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.filtros, form.lista_id, form.usar_lista_existente, step])

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: camps },
      { data: lists },
      { data: segs },
      { data: ests },
      { data: emailCfg },
    ] = await Promise.all([
      supabase.from("email_campanhas" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("email_listas" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("clientes").select("segmento").not("segmento", "is", null),
      supabase.from("clientes").select("estado").not("estado", "is", null),
      supabase.from("usuarios_email_config" as any).select("email").eq("user_id", user.id).single(),
    ])

    if (camps) setCampanhas(camps as unknown as Campanha[])
    if (lists) setListas(lists as unknown as Lista[])
    if (segs) {
      const uniq = [...new Set((segs as any[]).map((s) => s.segmento).filter(Boolean))].sort() as string[]
      setSegmentos(uniq)
    }
    if (ests) {
      const uniq = [...new Set((ests as any[]).map((e) => e.estado).filter(Boolean))].sort() as string[]
      setEstados(uniq)
    }
    if (emailCfg) {
      setForm((prev) => ({ ...prev, remetente_email: (emailCfg as any).email || "" }))
    }
    setLoading(false)
  }

  async function contarAudiencia() {
    setAudienciaLoading(true)
    try {
      if (form.usar_lista_existente && form.lista_id) {
        const lista = listas.find((l) => l.id === form.lista_id)
        setAudienciaCount(lista?.total_contatos || 0)
        return
      }
      let query = supabase.from("clientes").select("id", { count: "exact", head: true }).not("email", "is", null)
      const f = form.filtros
      if (f.segmento) query = query.eq("segmento", f.segmento)
      if (f.status)   query = query.eq("status", f.status)
      if (f.estado)   query = query.eq("estado", f.estado)
      if (f.tipo)     query = query.eq("tipo", f.tipo)
      const { count } = await query
      setAudienciaCount(count || 0)
    } finally {
      setAudienciaLoading(false)
    }
  }

  function set<K extends keyof CampanhaForm>(k: K, v: CampanhaForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function setFiltro(k: keyof FiltrosAudiencia, v: string) {
    setForm((prev) => ({ ...prev, filtros: { ...prev.filtros, [k]: v } }))
  }

  function selecionarTemplate(tipo: string) {
    setForm((prev) => ({ ...prev, template_tipo: tipo, conteudo_html: TEMPLATES[tipo]?.html || "" }))
  }

  function abrirWizard() {
    setStep(1)
    setWizardAberto(true)
  }

  async function salvar(status: "rascunho" | "agendada") {
    if (!form.nome || !form.assunto) { toast.error("Preencha nome e assunto"); return }
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autenticado")

      let lista_id: string | null = form.usar_lista_existente ? form.lista_id : null

      if (!form.usar_lista_existente && form.salvar_lista && form.nome_lista) {
        const { data: nl } = await supabase.from("email_listas" as any).insert({
          user_id: user.id,
          nome: form.nome_lista,
          filtros: form.filtros,
          total_contatos: audienciaCount,
        }).select().single()
        if (nl) lista_id = (nl as any).id
      }

      const agendado_para =
        form.tipo_envio === "agendado" && form.agendado_data
          ? new Date(`${form.agendado_data}T${form.agendado_hora}`).toISOString()
          : null

      const recorrencia =
        form.tipo_envio === "recorrente"
          ? { frequencia: form.recorrencia_frequencia, hora: form.agendado_hora }
          : null

      const { error } = await supabase.from("email_campanhas" as any).insert({
        user_id: user.id,
        nome: form.nome,
        assunto: form.assunto,
        pre_header: form.pre_header || null,
        remetente_nome: form.remetente_nome,
        remetente_email: form.remetente_email,
        lista_id,
        conteudo_html: form.conteudo_html,
        template_tipo: form.template_tipo,
        status,
        tipo_envio: form.tipo_envio,
        agendado_para,
        recorrencia,
        total_destinatarios: audienciaCount,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error

      toast.success(status === "rascunho" ? "Rascunho salvo!" : "Campanha agendada com sucesso!")
      setWizardAberto(false)
      setForm(FORM_INICIAL)
      carregar()
    } catch (err: any) {
      toast.error("Erro ao salvar campanha", { description: err?.message })
    } finally {
      setSalvando(false)
    }
  }

  async function duplicar(c: Campanha) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("email_campanhas" as any).insert({
      user_id: user.id,
      nome: `${c.nome} (cópia)`,
      assunto: c.assunto,
      pre_header: c.pre_header,
      remetente_nome: c.remetente_nome,
      remetente_email: c.remetente_email,
      lista_id: c.lista_id,
      conteudo_html: c.conteudo_html,
      template_tipo: c.template_tipo,
      status: "rascunho",
      tipo_envio: c.tipo_envio,
      total_destinatarios: c.total_destinatarios,
    })
    if (!error) { toast.success("Campanha duplicada"); carregar() }
  }

  const taxa = (enviados: number, valor: number) =>
    enviados > 0 ? Math.round((valor / enviados) * 100) : 0

  const podeProsseguir = () => {
    if (step === 1) return !!(form.nome && form.assunto && form.remetente_email)
    if (step === 2) return audienciaCount > 0
    if (step === 3) return !!form.conteudo_html
    return true
  }

  const totalEnviadas = campanhas.filter((c) => c.status === "enviada").length
  const mediaAbertura =
    totalEnviadas > 0
      ? Math.round(
          campanhas
            .filter((c) => c.status === "enviada")
            .reduce((acc, c) => acc + taxa(c.total_enviados, c.total_abertos), 0) / totalEnviadas
        )
      : 0

  const PASSOS = ["Identificação", "Base de Envio", "Conteúdo", "Agendamento"]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#164B6E]/40" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-heading text-[#164B6E]">Campanhas de E-mail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {campanhas.length} campanha{campanhas.length !== 1 ? "s" : ""} criada{campanhas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={abrirWizard} className="bg-[#C4942C] hover:bg-[#b8841f] text-white gap-2 h-9">
          <Plus size={14} /> Nova Campanha
        </Button>
      </div>

      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: campanhas.length,  Icon: Mail,       cor: "#164B6E" },
          { label: "Enviadas",  value: totalEnviadas,  Icon: Send,       cor: "#22c55e" },
          { label: "Abertura Média", value: `${mediaAbertura}%`, Icon: Eye, cor: "#C4942C" },
          { label: "Segmentos", value: listas.length,  Icon: Users,      cor: "#8b5cf6" },
        ].map(({ label, value, Icon, cor }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={13} style={{ color: cor }} />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold leading-none" style={{ color: cor }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Lista de campanhas ───────────────────────────────────────────── */}
      {campanhas.length === 0 ? (
        <div className="bg-white border border-border rounded-xl py-16 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#164B6E]/6 flex items-center justify-center">
            <Mail size={24} className="text-[#164B6E]/30" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-sm">Nenhuma campanha ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira campanha de e-mail marketing</p>
          </div>
          <Button
            onClick={abrirWizard}
            variant="outline"
            className="gap-2 border-[#C4942C] text-[#C4942C] hover:bg-[#C4942C]/10 h-9"
          >
            <Plus size={14} /> Criar primeira campanha
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border/50">
            {campanhas.map((c) => {
              const sc = STATUS_CONFIG[c.status]
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-foreground truncate">{c.nome}</span>
                      <span className={cn("inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", sc.color)}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.assunto}</p>
                  </div>
                  {c.status === "enviada" ? (
                    <div className="hidden sm:flex items-center gap-5 shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Enviados</p>
                        <p className="text-sm font-bold text-foreground">{c.total_enviados}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Abertura</p>
                        <p className="text-sm font-bold text-[#22c55e]">{taxa(c.total_enviados, c.total_abertos)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Cliques</p>
                        <p className="text-sm font-bold text-[#C4942C]">{taxa(c.total_enviados, c.total_clicados)}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Destinatários</p>
                      <p className="text-sm font-semibold text-foreground">{c.total_destinatarios}</p>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal size={13} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicar(c)} className="gap-2 text-sm">
                        <Copy size={13} /> Duplicar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Wizard ───────────────────────────────────────────────────────── */}
      <Dialog open={wizardAberto} onOpenChange={setWizardAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">

          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-border">
            <DialogTitle className="font-heading text-[#164B6E] text-base">Nova Campanha de E-mail</DialogTitle>
            {/* Indicador de passos */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {PASSOS.map((label, i) => {
                const n = i + 1
                const ativo = step === n
                const feito = step > n
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                        feito  ? "bg-green-500 text-white" :
                        ativo  ? "bg-[#164B6E] text-white" :
                                 "bg-muted text-muted-foreground"
                      )}>
                        {feito ? <Check size={11} strokeWidth={3} /> : n}
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium hidden sm:block",
                        ativo ? "text-[#164B6E]" : "text-muted-foreground"
                      )}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className={cn("w-5 h-px mx-1.5 shrink-0", step > n ? "bg-green-400" : "bg-border")} />
                    )}
                  </div>
                )
              })}
            </div>
          </DialogHeader>

          {/* Conteúdo do step */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-brand">
            {step === 1 && <Step1 form={form} onChange={set} />}
            {step === 2 && (
              <Step2
                form={form} listas={listas} segmentos={segmentos} estados={estados}
                audienciaCount={audienciaCount} audienciaLoading={audienciaLoading}
                onChange={set} onFiltro={setFiltro}
              />
            )}
            {step === 3 && <Step3 form={form} onChange={set} onTemplate={selecionarTemplate} />}
            {step === 4 && <Step4 form={form} audienciaCount={audienciaCount} onChange={set} />}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1 h-8">
                  <ChevronLeft size={13} /> Anterior
                </Button>
              )}
              {form.nome && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 text-xs"
                  onClick={() => salvar("rascunho")}
                  disabled={salvando}
                >
                  <FileText size={12} className="mr-1" /> Salvar Rascunho
                </Button>
              )}
            </div>

            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!podeProsseguir()}
                className="bg-[#164B6E] hover:bg-[#1a5a84] text-white gap-1 h-9"
              >
                Próximo <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                onClick={() => salvar(form.tipo_envio === "imediato" ? "agendada" : "agendada")}
                disabled={salvando || audienciaCount === 0}
                className="bg-[#C4942C] hover:bg-[#b8841f] text-white gap-1.5 h-9"
              >
                {salvando
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />
                }
                {form.tipo_envio === "imediato" ? "Confirmar Envio" : "Agendar Campanha"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Step 1 — Identificação ───────────────────────────────────────────────────
function Step1({
  form, onChange,
}: {
  form: CampanhaForm
  onChange: <K extends keyof CampanhaForm>(k: K, v: CampanhaForm[K]) => void
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Nome da Campanha *</Label>
        <Input
          value={form.nome}
          onChange={(e) => onChange("nome", e.target.value)}
          placeholder="Ex: Promoção Enxoval Verão 2025"
        />
        <p className="text-[11px] text-muted-foreground">Identificação interna — não aparece para o destinatário.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Assunto do E-mail *</Label>
        <Input
          value={form.assunto}
          onChange={(e) => onChange("assunto", e.target.value)}
          placeholder="Ex: Oferta exclusiva de enxoval para hotéis"
        />
        <p className="text-[11px] text-muted-foreground">Aparece na caixa de entrada do destinatário.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Pré-header <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          value={form.pre_header}
          onChange={(e) => onChange("pre_header", e.target.value)}
          placeholder="Ex: Condições especiais válidas até dia 30"
        />
        <p className="text-[11px] text-muted-foreground">Texto de preview exibido após o assunto em alguns e-mails.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Nome do Remetente</Label>
          <Input
            value={form.remetente_nome}
            onChange={(e) => onChange("remetente_nome", e.target.value)}
            placeholder="3W Hotelaria"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">E-mail Remetente *</Label>
          <Input
            type="email"
            value={form.remetente_email}
            onChange={(e) => onChange("remetente_email", e.target.value)}
            placeholder="comercial@3whotelaria.com.br"
          />
        </div>
      </div>
    </>
  )
}

// ─── Step 2 — Base de Envio ───────────────────────────────────────────────────
function Step2({
  form, listas, segmentos, estados,
  audienciaCount, audienciaLoading,
  onChange, onFiltro,
}: {
  form: CampanhaForm
  listas: Lista[]
  segmentos: string[]
  estados: string[]
  audienciaCount: number
  audienciaLoading: boolean
  onChange: <K extends keyof CampanhaForm>(k: K, v: CampanhaForm[K]) => void
  onFiltro: (k: keyof FiltrosAudiencia, v: string) => void
}) {
  return (
    <>
      {/* Modo de seleção */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: false, label: "Criar Segmento", desc: "Filtre os contatos agora", Icon: Filter },
          { key: true,  label: "Lista Salva",    desc: `${listas.length} lista${listas.length !== 1 ? "s" : ""} disponível`, Icon: Users },
        ].map(({ key, label, desc, Icon }) => (
          <button
            key={String(key)}
            onClick={() => onChange("usar_lista_existente", key)}
            disabled={key === true && listas.length === 0}
            className={cn(
              "border-2 rounded-xl p-4 text-left transition-all",
              form.usar_lista_existente === key
                ? "border-[#164B6E] bg-[#164B6E]/5"
                : "border-border hover:border-[#164B6E]/30",
              key === true && listas.length === 0 && "opacity-40 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
              form.usar_lista_existente === key ? "bg-[#164B6E] text-white" : "bg-muted text-muted-foreground"
            )}>
              <Icon size={14} />
            </div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {form.usar_lista_existente ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Selecionar Lista</Label>
          <Select value={form.lista_id} onValueChange={(v) => onChange("lista_id", v)}>
            <SelectTrigger><SelectValue placeholder="Escolha uma lista..." /></SelectTrigger>
            <SelectContent>
              {listas.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nome} — {l.total_contatos} contatos
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1"><Tag size={11} /> Segmento</Label>
              <Select
                value={form.filtros.segmento || "todos"}
                onValueChange={(v) => onFiltro("segmento", v === "todos" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os segmentos</SelectItem>
                  {segmentos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.filtros.status || "todos"}
                onValueChange={(v) => onFiltro("status", v === "todos" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1"><MapPin size={11} /> Estado</Label>
              <Select
                value={form.filtros.estado || "todos"}
                onValueChange={(v) => onFiltro("estado", v === "todos" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os estados</SelectItem>
                  {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1"><Star size={11} /> Tipo</Label>
              <Select
                value={form.filtros.tipo || "todos"}
                onValueChange={(v) => onFiltro("tipo", v === "todos" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salvar lista */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.salvar_lista}
                onChange={(e) => onChange("salvar_lista", e.target.checked)}
                className="rounded border-border accent-[#164B6E]"
              />
              <span className="text-sm font-medium">Salvar como lista reutilizável</span>
            </label>
            {form.salvar_lista && (
              <Input
                value={form.nome_lista}
                onChange={(e) => onChange("nome_lista", e.target.value)}
                placeholder="Nome da lista (ex: Hotéis SP Ativos VIP)"
              />
            )}
          </div>
        </>
      )}

      {/* Contador de audiência */}
      <div className={cn(
        "rounded-xl p-4 flex items-center gap-3 border transition-colors",
        audienciaCount > 0
          ? "bg-[#164B6E]/5 border-[#164B6E]/20"
          : "bg-amber-50 border-amber-200"
      )}>
        {audienciaLoading
          ? <Loader2 size={20} className="animate-spin text-[#164B6E] shrink-0" />
          : <Users size={20} className={audienciaCount > 0 ? "text-[#164B6E] shrink-0" : "text-amber-500 shrink-0"} />
        }
        <div>
          <p className={cn(
            "font-bold text-xl leading-none",
            audienciaCount > 0 ? "text-[#164B6E]" : "text-amber-600"
          )}>
            {audienciaLoading ? "..." : audienciaCount} contatos
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {audienciaCount === 0
              ? "Nenhum contato com e-mail cadastrado neste segmento"
              : "com e-mail cadastrado prontos para receber esta campanha"
            }
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Step 3 — Conteúdo ────────────────────────────────────────────────────────
function Step3({
  form, onChange, onTemplate,
}: {
  form: CampanhaForm
  onChange: <K extends keyof CampanhaForm>(k: K, v: CampanhaForm[K]) => void
  onTemplate: (tipo: string) => void
}) {
  const [preview, setPreview] = useState(false)
  return (
    <>
      {/* Templates */}
      <div>
        <Label className="text-xs font-semibold block mb-2">Modelo de E-mail</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => onTemplate(key)}
              className={cn(
                "border-2 rounded-xl p-3 text-left transition-all",
                form.template_tipo === key
                  ? "border-[#164B6E] bg-[#164B6E]/5"
                  : "border-border hover:border-[#164B6E]/30"
              )}
            >
              <p className="text-xs font-bold text-foreground">{t.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.descricao}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tokens */}
      <div className="bg-muted/40 rounded-xl p-3">
        <p className="text-[11px] font-semibold text-foreground mb-2">Tokens de personalização:</p>
        <div className="flex flex-wrap gap-1.5">
          {["{{nome}}", "{{empresa}}"].map((t) => (
            <span key={t} className="text-[11px] bg-white border border-border rounded px-2 py-0.5 font-mono text-[#164B6E]">
              {t}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Substituídos automaticamente pelo nome e empresa de cada destinatário no envio.
        </p>
      </div>

      {/* Editor / Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Conteúdo HTML</Label>
          <button
            onClick={() => setPreview((p) => !p)}
            className="flex items-center gap-1 text-[11px] text-[#164B6E] font-semibold hover:underline"
          >
            <Eye size={12} /> {preview ? "Editar" : "Pré-visualizar"}
          </button>
        </div>
        {preview ? (
          <div
            className="border rounded-xl p-4 min-h-48 max-h-72 overflow-auto bg-white text-sm scrollbar-brand"
            dangerouslySetInnerHTML={{ __html: form.conteudo_html }}
          />
        ) : (
          <Textarea
            value={form.conteudo_html}
            onChange={(e) => onChange("conteudo_html", e.target.value)}
            rows={11}
            className="font-mono text-xs scrollbar-brand resize-none"
            placeholder="Cole ou edite o HTML do seu e-mail aqui..."
          />
        )}
      </div>
    </>
  )
}

// ─── Step 4 — Agendamento ─────────────────────────────────────────────────────
function Step4({
  form, audienciaCount, onChange,
}: {
  form: CampanhaForm
  audienciaCount: number
  onChange: <K extends keyof CampanhaForm>(k: K, v: CampanhaForm[K]) => void
}) {
  return (
    <>
      {/* Tipo de envio */}
      <div>
        <Label className="text-xs font-semibold block mb-2">Quando enviar?</Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "imediato",   label: "Enviar Agora",  desc: "Assim que confirmar",       Icon: Send },
            { key: "agendado",   label: "Agendar",       desc: "Data e hora específica",     Icon: Calendar },
            { key: "recorrente", label: "Recorrente",    desc: "Repetir periodicamente",     Icon: RefreshCw },
          ] as const).map(({ key, label, desc, Icon }) => (
            <button
              key={key}
              onClick={() => onChange("tipo_envio", key)}
              className={cn(
                "border-2 rounded-xl p-3 text-left transition-all",
                form.tipo_envio === key
                  ? "border-[#164B6E] bg-[#164B6E]/5"
                  : "border-border hover:border-[#164B6E]/30"
              )}
            >
              <Icon
                size={16}
                className={cn("mb-1.5", form.tipo_envio === key ? "text-[#164B6E]" : "text-muted-foreground")}
              />
              <p className="text-xs font-bold leading-snug">{label}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {form.tipo_envio === "agendado" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Data</Label>
            <Input
              type="date"
              value={form.agendado_data}
              onChange={(e) => onChange("agendado_data", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Hora</Label>
            <Input
              type="time"
              value={form.agendado_hora}
              onChange={(e) => onChange("agendado_hora", e.target.value)}
            />
          </div>
        </div>
      )}

      {form.tipo_envio === "recorrente" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Frequência</Label>
            <Select
              value={form.recorrencia_frequencia}
              onValueChange={(v) => onChange("recorrencia_frequencia", v as "semanal" | "mensal")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Horário preferido</Label>
            <Input
              type="time"
              value={form.agendado_hora}
              onChange={(e) => onChange("agendado_hora", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="bg-[#164B6E]/5 border border-[#164B6E]/15 rounded-xl p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-[#164B6E] uppercase tracking-wider">Resumo da Campanha</p>
        {[
          { label: "Nome",         value: form.nome },
          { label: "Assunto",      value: form.assunto },
          { label: "Remetente",    value: `${form.remetente_nome} <${form.remetente_email}>` },
          { label: "Destinatários",value: `${audienciaCount} contatos` },
          {
            label: "Envio",
            value: form.tipo_envio === "imediato"
              ? "Imediato"
              : form.tipo_envio === "agendado"
              ? `${form.agendado_data} às ${form.agendado_hora}`
              : `Recorrente — ${form.recorrencia_frequencia}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
            <span className="text-xs font-semibold text-foreground text-right truncate">{value || "—"}</span>
          </div>
        ))}
      </div>

      {audienciaCount === 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Nenhum destinatário selecionado. Volte ao Passo 2 e ajuste o segmento.
          </p>
        </div>
      )}
    </>
  )
}
