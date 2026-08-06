import { useState, useEffect, useCallback, Fragment } from "react"
import { supabase } from "@/integrations/supabase/client"
import { apiFetch } from "@/lib/apiFetch"
import { useAuth } from "@/components/AuthProvider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  CATEGORIAS_CONSENTIMENTO, CATEGORIA_CONSENTIMENTO_LABEL, normalizarTelefone,
  type CategoriaConsentimento,
} from "@/lib/whatsappConsentimento"
import { STATUS_CONTATO_LABEL, QUALIFICACAO_OPTIONS, REGIOES, ESTADOS_POR_REGIAO, type StatusContato } from "@/lib/contatosOpcoes"
import {
  Plus, Send, Users, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Megaphone, SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

/**
 * Módulo Marketing → WhatsApp — só campanhas. Consentimento não vive mais
 * aqui: é um campo do cadastro de Contato (ContatoModal.tsx), disponível
 * pra QUALQUER contato do sistema, não só quem passou pelo Atendimento.
 * Pra alguém ficar elegível a uma campanha, precisa existir em `contatos`
 * com uma linha ativa em `contato_whatsapp_consentimento` na categoria
 * escolhida. Ver [[modulo-marketing-whatsapp]].
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────
type StatusCampanha = "rascunho" | "pronta" | "enviando" | "concluida" | "pausada" | "cancelada"
type StatusEnvio = "pendente" | "enviado" | "entregue" | "lido" | "falhou" | "bloqueado_optout"

type StatusTemplate = "APPROVED" | "PENDING" | "REJECTED" | string

interface Template {
  name: string
  language: string
  category: string
  status: StatusTemplate
  motivoRejeicao?: string
  texto: string
}

interface Campanha {
  id: string
  nome: string
  template_nome: string
  template_idioma: string
  categoria: "marketing" | "utility"
  categorias_alvo: CategoriaConsentimento[]
  status: StatusCampanha
  total_destinatarios: number
  total_enviados: number
  total_falhas: number
  total_optout_bloqueados: number
  created_at: string
  enviado_em: string | null
}

interface Envio {
  id: string
  campanha_id: string
  contato_id: string | null
  telefone: string
  nome: string | null
  status: StatusEnvio
  erro: string | null
  enviado_em: string | null
}

const STATUS_CAMPANHA_LABEL: Record<StatusCampanha, string> = {
  rascunho: "Rascunho", pronta: "Pronta pra disparar", enviando: "Enviando…",
  concluida: "Concluída", pausada: "Pausada", cancelada: "Cancelada",
}

const DELAY_ENTRE_ENVIOS_MS = 350 // pacing conservador — bem abaixo do throughput padrão da Meta (80 msg/s)

export interface FiltrosCampanha {
  status: Set<StatusContato>
  qualificacao: Set<string>
  segmento: Set<string>
  regiao: Set<string>
  estado: Set<string>
  cidade: string
}

export function filtrosVazios(): FiltrosCampanha {
  return { status: new Set(), qualificacao: new Set(), segmento: new Set(), regiao: new Set(), estado: new Set(), cidade: "" }
}

/**
 * Busca contatos elegíveis pra campanha: consentimento ativo nas categorias
 * escolhidas + regras fixas (nunca status='bloqueado', precisa ter
 * WhatsApp) + filtros opcionais de status/qualificação (direto em
 * `contatos`) e segmento/estado/cidade (via empresa vinculada em
 * `contato_cliente` → `clientes`). Reaproveitada tanto pra contagem ao
 * vivo no formulário quanto pra montar a campanha de verdade — mesma
 * lógica, sem duplicar.
 */
async function buscarContatosElegiveis(
  categorias: CategoriaConsentimento[],
  filtros: FiltrosCampanha,
): Promise<{ id: string; nome: string | null; telefone: string }[]> {
  if (categorias.length === 0) return []

  const { data: consentData } = await supabase.from("contato_whatsapp_consentimento" as any)
    .select("contato_id").eq("status", "opt_in").in("categoria", categorias)
  const idsConsentidos = Array.from(new Set((consentData as unknown as { contato_id: string }[] || []).map((r) => r.contato_id)))
  if (idsConsentidos.length === 0) return []

  // Região não é coluna do banco — expande pra UFs (mesmo mapeamento de
  // Clientes.tsx/BuscarEmpresas.tsx) e junta com os estados marcados direto.
  const estadosEfetivos = new Set([
    ...filtros.estado,
    ...Array.from(filtros.regiao).flatMap((r) => ESTADOS_POR_REGIAO[r] || []),
  ])

  const temFiltroEmpresa = filtros.segmento.size > 0 || estadosEfetivos.size > 0 || !!filtros.cidade.trim()
  let idsFinais = idsConsentidos

  if (temFiltroEmpresa) {
    let q = supabase.from("contato_cliente").select("contato_id, clientes!inner(segmento, estado, cidade)")
    if (filtros.segmento.size > 0) q = q.overlaps("clientes.segmento", Array.from(filtros.segmento))
    if (estadosEfetivos.size > 0) q = q.in("clientes.estado", Array.from(estadosEfetivos))
    if (filtros.cidade.trim()) q = q.ilike("clientes.cidade", `%${filtros.cidade.trim()}%`)
    const { data: viaEmpresa } = await q
    const idsViaEmpresa = new Set((viaEmpresa as unknown as { contato_id: string }[] || []).map((r) => r.contato_id))
    idsFinais = idsConsentidos.filter((id) => idsViaEmpresa.has(id))
    if (idsFinais.length === 0) return []
  }

  let query = supabase.from("contatos").select("id, nome, whatsapp")
    .in("id", idsFinais)
    .neq("status", "bloqueado") // regra fixa — nunca selecionável, independente do filtro escolhido
    .not("whatsapp", "is", null)
  if (filtros.status.size > 0) query = query.in("status", Array.from(filtros.status))
  if (filtros.qualificacao.size > 0) query = query.in("qualificacao", Array.from(filtros.qualificacao))

  const { data } = await query
  return ((data as unknown as { id: string; nome: string | null; whatsapp: string }[]) || [])
    .filter((c) => c.whatsapp)
    .map((c) => ({ id: c.id, nome: c.nome, telefone: normalizarTelefone(c.whatsapp) }))
}

export default function WhatsAppMarketing() {
  const { perfil } = useAuth()

  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  // nome do template → finalidades marcadas em Admin › Templates WhatsApp
  // ("campanha" precisa estar explicitamente marcada pra aparecer aqui —
  // diferente do Atendimento, que mostra por padrão quem não tem tag nenhuma).
  const [templateFinalidades, setTemplateFinalidades] = useState<Record<string, string[]>>({})
  const [contagensPorCategoria, setContagensPorCategoria] = useState<Record<CategoriaConsentimento, number>>({
    promocoes: 0, novidades: 0, avisos: 0,
  })
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: campanhaData }, { data: tagsData }, { data: consentData }] = await Promise.all([
      supabase.from("whatsapp_campanhas" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_template_tags" as any).select("template_nome, finalidades"),
      supabase.from("contato_whatsapp_consentimento" as any).select("categoria").eq("status", "opt_in"),
    ])
    setCampanhas((campanhaData as unknown as Campanha[]) || [])

    const mapaTags: Record<string, string[]> = {}
    for (const t of (tagsData as unknown as { template_nome: string; finalidades: string[] }[]) || []) {
      mapaTags[t.template_nome] = t.finalidades || []
    }
    setTemplateFinalidades(mapaTags)

    const contagens: Record<CategoriaConsentimento, number> = { promocoes: 0, novidades: 0, avisos: 0 }
    for (const c of (consentData as unknown as { categoria: CategoriaConsentimento }[]) || []) {
      contagens[c.categoria] = (contagens[c.categoria] || 0) + 1
    }
    setContagensPorCategoria(contagens)

    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    ;(async () => {
      try {
        const res = await apiFetch("/api/templates")
        const json = await res.json()
        if (json.ok) setTemplates(json.templates || [])
      } catch { /* seletor de campanha só fica vazio, tela não quebra */ }
    })()
  }, [carregar])

  const templatesAprovados = templates.filter((t) => (templateFinalidades[t.name] || []).includes("campanha"))
  const totalAptos = contagensPorCategoria.promocoes + contagensPorCategoria.novidades + contagensPorCategoria.avisos

  return (
    <div className="p-5 space-y-5">
      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Megaphone} label="Campanhas" value={campanhas.length} tone="muted" />
        {CATEGORIAS_CONSENTIMENTO.map((c) => (
          <StatCard key={c} icon={Users} label={`Aptos — ${CATEGORIA_CONSENTIMENTO_LABEL[c]}`} value={contagensPorCategoria[c]} tone="good" />
        ))}
      </div>

      {totalAptos === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Nenhum contato com consentimento de marketing ainda.</p>
            <p className="text-xs mt-0.5 opacity-90">
              O consentimento é marcado no cadastro de cada contato, em <strong>Contatos</strong> — abra um contato, marque "Consentimento de marketing (WhatsApp)" e salve.
              Só contatos marcados assim ficam disponíveis pra campanha.
            </p>
          </div>
        </div>
      )}

      <AbaCampanhas
        campanhas={campanhas}
        templates={templatesAprovados}
        loading={loading}
        perfilId={perfil?.id}
        onRecarregar={carregar}
      />
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: "good" | "muted" }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        tone === "good" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
      )}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium">{label}</p>
      </div>
    </div>
  )
}

// ─── Campanhas ──────────────────────────────────────────────────────────────
// Sem etapa de "lista": a campanha define quem recebe escolhendo categorias
// de consentimento — o sistema busca os contatos elegíveis (em `contatos` +
// `contato_whatsapp_consentimento`) sozinho na hora de criar.
function AbaCampanhas({ campanhas, templates, loading, perfilId, onRecarregar }: {
  campanhas: Campanha[]; templates: Template[]
  loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({ nome: "", template: "", categorias: new Set<CategoriaConsentimento>() })
  const [filtros, setFiltros] = useState<FiltrosCampanha>(filtrosVazios())
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [opcoesSegmento, setOpcoesSegmento] = useState<string[]>([])
  const [opcoesEstado, setOpcoesEstado] = useState<string[]>([])
  const [contagemElegiveis, setContagemElegiveis] = useState<number | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)

  const templateEscolhido = templates.find((t) => t.name === form.template)

  // Opções de Segmento/Estado vêm de funções no banco (não da tabela
  // `clientes` direto — ela tem ~236 mil linhas, ver nota na migration).
  useEffect(() => {
    if (!dialogAberto) return
    ;(async () => {
      const [{ data: segs }, { data: ests }] = await Promise.all([
        supabase.rpc("listar_segmentos_clientes" as any),
        supabase.rpc("listar_estados_clientes" as any),
      ])
      setOpcoesSegmento((segs as unknown as string[]) || [])
      setOpcoesEstado((ests as unknown as string[]) || [])
    })()
  }, [dialogAberto])

  // Recalcula quantos contatos elegíveis existem toda vez que categoria ou
  // algum filtro muda — mesma função usada na criação de verdade.
  useEffect(() => {
    if (!dialogAberto || form.categorias.size === 0) { setContagemElegiveis(null); return }
    let cancelado = false
    ;(async () => {
      const lista = await buscarContatosElegiveis(Array.from(form.categorias), filtros)
      if (!cancelado) setContagemElegiveis(lista.length)
    })()
    return () => { cancelado = true }
  }, [dialogAberto, form.categorias, filtros])

  function toggleCategoria(c: CategoriaConsentimento) {
    setForm((f) => {
      const next = new Set(f.categorias)
      if (next.has(c)) next.delete(c); else next.add(c)
      return { ...f, categorias: next }
    })
  }

  function toggleFiltroSet<K extends "status" | "qualificacao" | "segmento" | "regiao" | "estado">(chave: K, valor: string) {
    setFiltros((f) => {
      const next = new Set(f[chave] as Set<string>)
      if (next.has(valor)) next.delete(valor); else next.add(valor)
      return { ...f, [chave]: next }
    })
  }

  async function criarCampanha() {
    if (!form.nome.trim()) return toast.error("Dê um nome pra campanha")
    if (!form.template) return toast.error("Escolha um template aprovado")
    if (form.categorias.size === 0) return toast.error("Escolha ao menos uma categoria de destinatários")
    setCriando(true)

    const categoriasArr = Array.from(form.categorias)
    const { data: campanha, error } = await supabase.from("whatsapp_campanhas" as any).insert({
      nome: form.nome, template_nome: form.template, template_idioma: templateEscolhido?.language || "pt_BR",
      categoria: (templateEscolhido?.category || "marketing").toLowerCase(),
      categorias_alvo: categoriasArr, status: "rascunho", criado_por: perfilId,
    }).select().single()

    if (error || !campanha) {
      setCriando(false)
      return toast.error(`Erro ao criar campanha: ${error?.message}`)
    }

    const lista = await buscarContatosElegiveis(categoriasArr, filtros)

    if (lista.length > 0) {
      await supabase.from("whatsapp_campanha_envios" as any).insert(
        lista.map((m) => ({ campanha_id: (campanha as any).id, contato_id: m.id, telefone: m.telefone, nome: m.nome, status: "pendente" })),
      )
    }
    await supabase.from("whatsapp_campanhas" as any).update({
      total_destinatarios: lista.length, status: lista.length > 0 ? "pronta" : "rascunho",
    }).eq("id", (campanha as any).id)

    setCriando(false)
    toast.success(lista.length > 0
      ? `Campanha pronta com ${lista.length} destinatário(s)`
      : "Campanha criada, mas nenhum contato elegível com esses filtros ainda")
    setDialogAberto(false)
    setForm({ nome: "", template: "", categorias: new Set() })
    setFiltros(filtrosVazios())
    setMostrarFiltros(false)
    onRecarregar()
  }

  async function dispararCampanha(campanha: Campanha) {
    setEnviandoId(campanha.id)
    await supabase.from("whatsapp_campanhas" as any).update({ status: "enviando" }).eq("id", campanha.id)

    let enviados = campanha.total_enviados
    let falhas = campanha.total_falhas
    let bloqueados = campanha.total_optout_bloqueados
    const total = campanha.total_destinatarios
    setProgresso({ atual: enviados + falhas + bloqueados, total })

    // Loop resumível: sempre reconsulta pendentes, então fechar a aba no meio é seguro.
    while (true) {
      const { data: lote } = await supabase.from("whatsapp_campanha_envios" as any)
        .select("id, telefone, contato_id").eq("campanha_id", campanha.id).eq("status", "pendente").limit(1)
      const envio = (lote as unknown as { id: string; telefone: string; contato_id: string | null }[] | null)?.[0]
      if (!envio) break

      // Reconfirma consentimento ativo no instante do envio, pelo contato
      // (defesa em profundidade — se ele revogou entre a criação e o disparo).
      const aindaConsentido = envio.contato_id
        ? await supabase.from("contato_whatsapp_consentimento" as any)
            .select("id").eq("contato_id", envio.contato_id).eq("status", "opt_in")
            .in("categoria", campanha.categorias_alvo).limit(1)
        : { data: [] }

      if (!aindaConsentido.data || aindaConsentido.data.length === 0) {
        await supabase.from("whatsapp_campanha_envios" as any).update({ status: "bloqueado_optout", atualizado_em: new Date().toISOString() }).eq("id", envio.id)
        bloqueados++
      } else {
        try {
          const res = await apiFetch("/api/enviar-mensagem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone_cliente: envio.telefone, template: { name: campanha.template_nome, language: campanha.template_idioma } }),
          })
          const json = await res.json()
          if (json.ok) {
            await supabase.from("whatsapp_campanha_envios" as any).update({
              status: "enviado", enviado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
            }).eq("id", envio.id)
            enviados++
          } else {
            await supabase.from("whatsapp_campanha_envios" as any).update({
              status: "falhou", erro: json.error || `status ${res.status}`, atualizado_em: new Date().toISOString(),
            }).eq("id", envio.id)
            falhas++
          }
        } catch (e) {
          await supabase.from("whatsapp_campanha_envios" as any).update({ status: "falhou", erro: String(e), atualizado_em: new Date().toISOString() }).eq("id", envio.id)
          falhas++
        }
      }

      setProgresso({ atual: enviados + falhas + bloqueados, total })
      await supabase.from("whatsapp_campanhas" as any).update({
        total_enviados: enviados, total_falhas: falhas, total_optout_bloqueados: bloqueados,
      }).eq("id", campanha.id)

      await new Promise((r) => setTimeout(r, DELAY_ENTRE_ENVIOS_MS))
    }

    await supabase.from("whatsapp_campanhas" as any).update({ status: "concluida", enviado_em: new Date().toISOString() }).eq("id", campanha.id)
    setEnviandoId(null)
    setProgresso(null)
    toast.success(`Campanha "${campanha.nome}" concluída — ${enviados} enviados, ${falhas} falhas, ${bloqueados} bloqueados por opt-out`)
    onRecarregar()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Escolha um template aprovado e quem deve receber — sem montar lista na mão.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogAberto(true)}><Plus size={14} /> Nova campanha</Button>
      </div>

      {templates.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0" /> Nenhum template marcado pra campanha ainda — crie ou marque um em <strong className="mx-1">Admin › Templates WhatsApp</strong> antes de montar uma campanha.
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Público</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : campanhas.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma campanha ainda.</TableCell></TableRow>
            ) : campanhas.map((c) => {
              const feitos = c.total_enviados + c.total_falhas + c.total_optout_bloqueados
              const pct = c.total_destinatarios > 0 ? Math.round((feitos / c.total_destinatarios) * 100) : 0
              const emEnvio = enviandoId === c.id
              return (
                <Fragment key={c.id}>
                  <TableRow>
                    <TableCell>
                      <button onClick={() => setExpandida(expandida === c.id ? null : c.id)} className="text-muted-foreground">
                        {expandida === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{c.template_nome}</span>
                      <Badge variant="outline" className="ml-1.5 text-[10px]">{c.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(c.categorias_alvo || []).map((cat) => CATEGORIA_CONSENTIMENTO_LABEL[cat]).join(", ") || "—"}
                    </TableCell>
                    <TableCell><Badge variant={c.status === "concluida" ? "default" : "secondary"}>{STATUS_CAMPANHA_LABEL[c.status]}</Badge></TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Progress value={emEnvio ? Math.round(((progresso?.atual ?? 0) / (progresso?.total || 1)) * 100) : pct} className="h-2 w-24" />
                        <span className="text-[11px] text-muted-foreground tabular-nums">{feitos}/{c.total_destinatarios}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {(c.status === "pronta" || c.status === "enviando") && c.total_destinatarios > 0 && (
                        <Button size="sm" className="gap-1.5" disabled={emEnvio} onClick={() => dispararCampanha(c)}>
                          {emEnvio ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          {emEnvio ? "Enviando…" : c.status === "enviando" ? "Continuar" : "Disparar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandida === c.id && <CampanhaDetalhe campanhaId={c.id} />}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome (interno, não vai pro cliente)</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Promoção agosto" />
            </div>
            <div>
              <Label className="text-xs">Template aprovado</Label>
              <Select value={form.template} onValueChange={(v) => setForm((f) => ({ ...f, template: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolha um template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name} ({t.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateEscolhido && (
                <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded px-2 py-1.5">{templateEscolhido.texto}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Quem deve receber</Label>
              <div className="space-y-1.5 mt-1">
                {CATEGORIAS_CONSENTIMENTO.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.categorias.has(c)} onCheckedChange={() => toggleCategoria(c)} />
                    {CATEGORIA_CONSENTIMENTO_LABEL[c]}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Consentimento é marcado no cadastro de cada contato, em Contatos — não dá pra adicionar alguém aqui direto.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setMostrarFiltros((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <SlidersHorizontal size={12} />
                Filtros adicionais (opcional)
                {mostrarFiltros ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {mostrarFiltros && (
                <div className="mt-2 space-y-3 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-xs">Status do contato</Label>
                    <div className="flex gap-4 mt-1">
                      {(Object.keys(STATUS_CONTATO_LABEL) as StatusContato[]).map((s) => (
                        <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={filtros.status.has(s)} onCheckedChange={() => toggleFiltroSet("status", s)} />
                          {STATUS_CONTATO_LABEL[s]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Qualificação</Label>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                      {QUALIFICACAO_OPTIONS.map((q) => (
                        <label key={q.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox checked={filtros.qualificacao.has(q.value)} onCheckedChange={() => toggleFiltroSet("qualificacao", q.value)} />
                          {q.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {opcoesSegmento.length > 0 && (
                    <div>
                      <Label className="text-xs">Segmento da empresa</Label>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {opcoesSegmento.map((s) => (
                          <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={filtros.segmento.has(s)} onCheckedChange={() => toggleFiltroSet("segmento", s)} />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Região</Label>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                        <Checkbox
                          checked={REGIOES.every((r) => filtros.regiao.has(r))}
                          onCheckedChange={(v) => setFiltros((f) => ({ ...f, regiao: v ? new Set(REGIOES) : new Set() }))}
                        />
                        Todas
                      </label>
                      {REGIOES.map((r) => (
                        <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox checked={filtros.regiao.has(r)} onCheckedChange={() => toggleFiltroSet("regiao", r)} />
                          {r}
                        </label>
                      ))}
                    </div>
                  </div>

                  {opcoesEstado.length > 0 && (
                    <div>
                      <Label className="text-xs">Estado (UF) {filtros.regiao.size > 0 && <span className="text-muted-foreground font-normal">(além da região)</span>}</Label>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                        {opcoesEstado.map((uf) => (
                          <label key={uf} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox checked={filtros.estado.has(uf)} onCheckedChange={() => toggleFiltroSet("estado", uf)} />
                            {uf}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Cidade</Label>
                    <Input
                      className="h-8 text-sm"
                      value={filtros.cidade}
                      onChange={(e) => setFiltros((f) => ({ ...f, cidade: e.target.value }))}
                      placeholder="Ex.: São Paulo"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Segmento/Região/Estado/Cidade vêm da empresa vinculada ao contato — um contato ligado a mais de uma empresa entra se qualquer uma delas bater com o filtro. Contatos com status "Bloqueado" nunca entram, mesmo sem marcar nada aqui.
                  </p>
                </div>
              )}

              {form.categorias.size > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {contagemElegiveis === null ? "Calculando…" : `${contagemElegiveis} contato(s) elegível(is) agora`}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={criarCampanha} disabled={criando}>{criando ? "Criando…" : "Criar campanha"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CampanhaDetalhe({ campanhaId }: { campanhaId: string }) {
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("whatsapp_campanha_envios" as any)
        .select("*").eq("campanha_id", campanhaId).order("atualizado_em", { ascending: false }).limit(200)
      setEnvios((data as any) || [])
      setLoading(false)
    })()
  }, [campanhaId])

  const STATUS_TONE: Record<StatusEnvio, "default" | "secondary" | "destructive" | "outline"> = {
    pendente: "outline", enviado: "secondary", entregue: "secondary", lido: "default",
    falhou: "destructive", bloqueado_optout: "destructive",
  }

  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/30 p-0">
        <div className="max-h-64 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando envios…</p>
          ) : envios.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum envio ainda — não havia contato elegível no momento da criação.</p>
          ) : (
            <div className="space-y-1">
              {envios.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs py-0.5">
                  <span>{e.nome || <span className="font-mono">{e.telefone}</span>}</span>
                  <span className="flex items-center gap-2">
                    {e.erro && <span className="text-destructive truncate max-w-[240px]">{e.erro}</span>}
                    <Badge variant={STATUS_TONE[e.status]} className="text-[10px]">{e.status}</Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
