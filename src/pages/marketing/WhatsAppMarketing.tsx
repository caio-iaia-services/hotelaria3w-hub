import { useState, useEffect, useCallback, Fragment } from "react"
import { supabase } from "@/integrations/supabase/client"
import { apiFetch } from "@/lib/apiFetch"
import { useAuth } from "@/components/AuthProvider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Plus, Send, ShieldCheck, ShieldX, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Megaphone, FileText, Clock, X as XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Categoria = "promocoes" | "novidades" | "avisos"
type StatusOptIn = "opt_in" | "opt_out"
type Origem = "formulario_site" | "confirmacao_atendimento" | "importacao_manual_confirmada" | "anuncio_click_to_whatsapp" | "outro"
type StatusCampanha = "rascunho" | "pronta" | "enviando" | "concluida" | "pausada" | "cancelada"
type StatusEnvio = "pendente" | "enviado" | "entregue" | "lido" | "falhou" | "bloqueado_optout"

interface OptIn {
  id: string
  telefone: string
  nome: string | null
  categoria: Categoria
  status: StatusOptIn
  origem: Origem
  observacao: string | null
  registrado_em: string
}

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
  categorias_alvo: Categoria[]
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
  telefone: string
  nome: string | null
  status: StatusEnvio
  erro: string | null
  enviado_em: string | null
}

const CATEGORIAS: Categoria[] = ["promocoes", "novidades", "avisos"]
const CATEGORIA_LABEL: Record<Categoria, string> = {
  promocoes: "Promoções", novidades: "Novidades", avisos: "Avisos",
}
const ORIGEM_LABEL: Record<Origem, string> = {
  formulario_site: "Formulário do site",
  confirmacao_atendimento: "Confirmado no Atendimento",
  importacao_manual_confirmada: "Importação (consentimento verificado)",
  anuncio_click_to_whatsapp: "Anúncio click-to-WhatsApp",
  outro: "Outro",
}
const STATUS_CAMPANHA_LABEL: Record<StatusCampanha, string> = {
  rascunho: "Rascunho", pronta: "Pronta pra disparar", enviando: "Enviando…",
  concluida: "Concluída", pausada: "Pausada", cancelada: "Cancelada",
}

/** Normaliza telefone: só dígitos, garante DDI 55 (mesma regra de api/enviar-mensagem.ts). */
function normalizarTelefone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("55") ? digits : `55${digits}`
}

/** Aceita telefones separados por linha ou vírgula, normaliza e remove duplicados/vazios. */
function extrairTelefones(raw: string): string[] {
  const brutos = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
  return Array.from(new Set(brutos.map(normalizarTelefone)))
}

/** Transforma texto livre no formato de nome que a Meta exige pra template. */
function slugifyNomeTemplate(raw: string): string {
  const semAcento = Array.from(raw.normalize("NFD"))
    .filter((ch) => { const c = ch.codePointAt(0) || 0; return c < 0x300 || c > 0x36f })
    .join("")
  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 200)
}

/** Detecta {{1}}, {{2}}... no corpo do template, em ordem crescente e sem repetir. */
function detectarVariaveis(texto: string): number[] {
  const nums = [...texto.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10))
  return Array.from(new Set(nums)).sort((a, b) => a - b)
}

const DELAY_ENTRE_ENVIOS_MS = 350 // pacing conservador — bem abaixo do throughput padrão da Meta (80 msg/s)

export default function WhatsAppMarketing() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState("optin")

  const [optins, setOptins] = useState<OptIn[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateTags, setTemplateTags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [erroTemplates, setErroTemplates] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: optinData }, { data: campanhaData }, { data: tagsData }] = await Promise.all([
      supabase.from("whatsapp_opt_in" as any).select("*").order("registrado_em", { ascending: false }),
      supabase.from("whatsapp_campanhas" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_template_tags" as any).select("template_nome, uso_campanha"),
    ])
    setOptins((optinData as unknown as OptIn[]) || [])
    setCampanhas((campanhaData as unknown as Campanha[]) || [])
    const mapa: Record<string, boolean> = {}
    for (const t of (tagsData as unknown as { template_nome: string; uso_campanha: boolean }[]) || []) {
      mapa[t.template_nome] = t.uso_campanha
    }
    setTemplateTags(mapa)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    ;(async () => {
      await recarregarTemplates()
    })()
  }, [carregar])

  async function recarregarTemplates() {
    try {
      const res = await apiFetch("/api/templates?todos=1")
      const json = await res.json()
      if (json.ok) { setTemplates(json.templates || []); setErroTemplates(null) }
      else setErroTemplates(json.error || "Falha ao carregar templates")
    } catch (e) {
      setErroTemplates(String(e))
    }
  }

  async function recarregarTudo() {
    await Promise.all([carregar(), recarregarTemplates()])
  }

  /** Marca/desmarca um template como disponível pra campanha (upsert por nome). */
  async function alternarUsoCampanha(nome: string, valor: boolean) {
    const { error } = await supabase.from("whatsapp_template_tags" as any)
      .upsert({ template_nome: nome, uso_campanha: valor }, { onConflict: "template_nome" })
    if (error) { toast.error(`Erro ao atualizar: ${error.message}`); return }
    setTemplateTags((prev) => ({ ...prev, [nome]: valor }))
  }

  const optinsAtivos = optins.filter((o) => o.status === "opt_in").length
  const optinsOut = optins.filter((o) => o.status === "opt_out").length
  const templatesAprovados = templates.filter((t) => t.status === "APPROVED" && templateTags[t.name])

  return (
    <div className="p-5 space-y-5">
      {/* ── Stats + aviso de fundação ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ShieldCheck} label="Opt-in ativos" value={optinsAtivos} tone="good" />
        <StatCard icon={ShieldX} label="Opt-out" value={optinsOut} tone="muted" />
        <StatCard icon={Megaphone} label="Campanhas" value={campanhas.length} tone="muted" />
      </div>

      {optinsAtivos === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Nenhum contato com consentimento registrado ainda.</p>
            <p className="text-xs mt-0.5 opacity-90">
              Por política da Meta, ninguém pode entrar numa campanha sem opt-in explícito.
              Registre consentimento abaixo antes de criar uma campanha.
            </p>
          </div>
        </div>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="optin" className="gap-1.5"><ShieldCheck size={14} /> Consentimento</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText size={14} /> Templates</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-1.5"><Megaphone size={14} /> Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="optin" className="mt-4">
          <AbaOptIn optins={optins} loading={loading} perfilId={perfil?.id} onRecarregar={carregar} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <AbaTemplates
            templates={templates}
            templateTags={templateTags}
            erroTemplates={erroTemplates}
            onRecarregar={recarregarTudo}
            onAlternarUso={alternarUsoCampanha}
          />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-4">
          <AbaCampanhas
            campanhas={campanhas}
            templates={templatesAprovados}
            loading={loading}
            perfilId={perfil?.id}
            onRecarregar={carregar}
          />
        </TabsContent>
      </Tabs>
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

// ─── Aba Consentimento ──────────────────────────────────────────────────────────
// Formulário único: aceita 1 telefone ou vários colados de uma vez (um por
// linha ou separados por vírgula) — não existe mais um modo "em lote" à
// parte, é o mesmo campo pros dois casos.
function AbaOptIn({ optins, loading, perfilId, onRecarregar }: {
  optins: OptIn[]; loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    telefones: "", nome: "", categoria: "promocoes" as Categoria,
    origem: "confirmacao_atendimento" as Origem, observacao: "", confirmo: false,
  })

  async function registrar() {
    const telefones = extrairTelefones(form.telefones)
    if (telefones.length === 0) return toast.error("Cole ao menos um telefone")
    if (!form.confirmo) return toast.error("Confirme que o consentimento foi de fato coletado")
    setSalvando(true)

    const { data: existentesData } = await supabase.from("whatsapp_opt_in" as any)
      .select("telefone").eq("categoria", form.categoria).in("telefone", telefones)
    const jaExistem = new Set((existentesData as unknown as { telefone: string }[] || []).map((e) => e.telefone))
    const novos = telefones.filter((t) => !jaExistem.has(t))

    if (novos.length === 0) {
      setSalvando(false)
      toast.info("Todos esses números já tinham opt-in registrado nessa categoria")
      return
    }

    const { error } = await supabase.from("whatsapp_opt_in" as any).insert(
      novos.map((telefone) => ({
        telefone,
        nome: telefones.length === 1 ? (form.nome || null) : null,
        categoria: form.categoria, status: "opt_in", origem: form.origem,
        observacao: form.observacao || null, registrado_por: perfilId,
      })),
    )
    setSalvando(false)
    if (error) return toast.error(`Erro ao registrar: ${error.message}`)

    toast.success(
      jaExistem.size > 0
        ? `${novos.length} registrado(s), ${jaExistem.size} já existiam nessa categoria`
        : `${novos.length} registrado(s)`,
    )
    setDialogAberto(false)
    setForm({ telefones: "", nome: "", categoria: "promocoes", origem: "confirmacao_atendimento", observacao: "", confirmo: false })
    onRecarregar()
  }

  async function alternarStatus(o: OptIn) {
    const novo: StatusOptIn = o.status === "opt_in" ? "opt_out" : "opt_in"
    const { error } = await supabase.from("whatsapp_opt_in" as any).update({ status: novo }).eq("id", o.id)
    if (error) return toast.error("Erro ao atualizar")
    toast.success(novo === "opt_out" ? "Marcado como opt-out" : "Reativado como opt-in")
    onRecarregar()
  }

  const multiplos = extrairTelefones(form.telefones).length > 1

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cada linha é um consentimento auditável — telefone + categoria + de onde veio.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogAberto(true)}>
          <Plus size={14} /> Registrar consentimento
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Telefone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : optins.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro ainda.</TableCell></TableRow>
            ) : optins.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.telefone}</TableCell>
                <TableCell>{o.nome || "—"}</TableCell>
                <TableCell>{CATEGORIA_LABEL[o.categoria]}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ORIGEM_LABEL[o.origem]}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "opt_in" ? "default" : "secondary"}>
                    {o.status === "opt_in" ? "Opt-in" : "Opt-out"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => alternarStatus(o)}>
                    {o.status === "opt_in" ? "Marcar opt-out" : "Reativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar consentimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Telefone(s)</Label>
              <Textarea
                rows={3}
                value={form.telefones}
                onChange={(e) => setForm((f) => ({ ...f, telefones: e.target.value }))}
                placeholder={"Um por linha ou separados por vírgula\n(11) 99999-9999\n(11) 98888-8888"}
              />
            </div>
            <div>
              <Label className="text-xs">Nome {multiplos && <span className="text-muted-foreground font-normal">(só é salvo se for 1 telefone só)</span>}</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} disabled={multiplos} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as Categoria }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Origem</Label>
                <Select value={form.origem} onValueChange={(v) => setForm((f) => ({ ...f, origem: v as Origem }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORIGEM_LABEL) as Origem[]).map((o) => (
                      <SelectItem key={o} value={o}>{ORIGEM_LABEL[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="Ex.: respondeu ao anúncio de captação em 05/08" />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
              <Checkbox checked={form.confirmo} onCheckedChange={(v) => setForm((f) => ({ ...f, confirmo: !!v }))} className="mt-0.5" />
              Confirmo que {multiplos ? "todos esses números deram" : "esta pessoa deu"} consentimento explícito pra receber mensagens de marketing da 3W.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={registrar} disabled={salvando}>{salvando ? "Salvando…" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Aba Campanhas ──────────────────────────────────────────────────────────
// Sem etapa de "lista": a campanha define quem recebe escolhendo categorias
// de opt-in — o sistema busca os contatos elegíveis sozinho na hora de criar.
function AbaCampanhas({ campanhas, templates, loading, perfilId, onRecarregar }: {
  campanhas: Campanha[]; templates: Template[]
  loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({ nome: "", template: "", categorias: new Set<Categoria>() })
  const [contagemElegiveis, setContagemElegiveis] = useState<number | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)

  const templateEscolhido = templates.find((t) => t.name === form.template)

  // Recalcula quantos contatos elegíveis existem toda vez que as categorias mudam.
  useEffect(() => {
    if (!dialogAberto || form.categorias.size === 0) { setContagemElegiveis(null); return }
    let cancelado = false
    ;(async () => {
      const { count } = await supabase.from("whatsapp_opt_in" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "opt_in").in("categoria", Array.from(form.categorias))
      if (!cancelado) setContagemElegiveis(count ?? 0)
    })()
    return () => { cancelado = true }
  }, [dialogAberto, form.categorias])

  function toggleCategoria(c: Categoria) {
    setForm((f) => {
      const next = new Set(f.categorias)
      if (next.has(c)) next.delete(c); else next.add(c)
      return { ...f, categorias: next }
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

    const { data: elegiveis } = await supabase.from("whatsapp_opt_in" as any)
      .select("telefone, nome").eq("status", "opt_in").in("categoria", categoriasArr)
    const lista = (elegiveis as unknown as { telefone: string; nome: string | null }[]) || []

    if (lista.length > 0) {
      await supabase.from("whatsapp_campanha_envios" as any).insert(
        lista.map((m) => ({ campanha_id: (campanha as any).id, telefone: m.telefone, nome: m.nome, status: "pendente" })),
      )
    }
    await supabase.from("whatsapp_campanhas" as any).update({
      total_destinatarios: lista.length, status: lista.length > 0 ? "pronta" : "rascunho",
    }).eq("id", (campanha as any).id)

    setCriando(false)
    toast.success(lista.length > 0
      ? `Campanha pronta com ${lista.length} destinatário(s)`
      : "Campanha criada, mas nenhum contato elegível nessas categorias ainda")
    setDialogAberto(false)
    setForm({ nome: "", template: "", categorias: new Set() })
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
        .select("id, telefone").eq("campanha_id", campanha.id).eq("status", "pendente").limit(1)
      const envio = (lote as unknown as { id: string; telefone: string }[] | null)?.[0]
      if (!envio) break

      // Reconfirma opt-in ativo no instante do envio (defesa em profundidade).
      const { data: aindaOptIn } = await supabase.from("whatsapp_opt_in" as any)
        .select("id").eq("telefone", envio.telefone).eq("status", "opt_in").limit(1)

      if (!aindaOptIn || aindaOptIn.length === 0) {
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
          <AlertCircle size={14} className="shrink-0" /> Nenhum template aprovado ainda — crie um na aba <strong className="mx-1">Templates</strong> antes de montar uma campanha.
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
                      {(c.categorias_alvo || []).map((cat) => CATEGORIA_LABEL[cat]).join(", ") || "—"}
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
        <DialogContent className="max-w-md">
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
                {CATEGORIAS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.categorias.has(c)} onCheckedChange={() => toggleCategoria(c)} />
                    {CATEGORIA_LABEL[c]}
                  </label>
                ))}
              </div>
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
                  <span className="font-mono">{e.telefone}</span>
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

// ─── Aba Templates ──────────────────────────────────────────────────────────
// Cria template direto na WABA via api/criar-template.ts — ninguém precisa
// entrar no Business Manager da Meta pra isso. Nome é auto-formatado
// enquanto a pessoa digita (letras minúsculas, números e _); variáveis
// {{1}}, {{2}}... detectadas no corpo pedem um exemplo cada, porque a Meta
// exige isso pra aprovar.
const STATUS_TEMPLATE_INFO: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  APPROVED: { label: "Aprovado", tone: "default" },
  PENDING: { label: "Em análise", tone: "secondary" },
  REJECTED: { label: "Rejeitado", tone: "destructive" },
}

function AbaTemplates({ templates, templateTags, erroTemplates, onRecarregar, onAlternarUso }: {
  templates: Template[]; templateTags: Record<string, boolean>; erroTemplates: string | null
  onRecarregar: () => Promise<void> | void; onAlternarUso: (nome: string, valor: boolean) => Promise<void>
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nomeDigitado, setNomeDigitado] = useState("")
  const [form, setForm] = useState({
    language: "pt_BR", category: "MARKETING" as "MARKETING" | "UTILITY",
    corpo: "", rodape: "",
  })
  const [exemplos, setExemplos] = useState<Record<number, string>>({})

  const nomeFinal = slugifyNomeTemplate(nomeDigitado)
  const variaveis = detectarVariaveis(form.corpo)

  async function criar() {
    if (!nomeFinal) return toast.error("Dê um nome pro template")
    if (!form.corpo.trim()) return toast.error("Escreva o corpo da mensagem")
    if (variaveis.some((v) => !exemplos[v]?.trim())) return toast.error("Preencha um exemplo pra cada variável — a Meta exige isso pra aprovar")

    setEnviando(true)
    try {
      const res = await apiFetch("/api/criar-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nomeFinal, language: form.language, category: form.category,
          corpo: form.corpo, rodape: form.rodape || undefined,
          exemplos: variaveis.map((v) => exemplos[v]),
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || "Erro ao enviar template pra aprovação")
      } else {
        // Criado por aqui = "de campanha" por definição — já nasce marcado,
        // sem precisar de um passo manual extra depois.
        await onAlternarUso(nomeFinal, true)
        toast.success('Template enviado! Vai aparecer como "Em análise" até a Meta revisar.')
        setDialogAberto(false)
        setNomeDigitado(""); setForm({ language: "pt_BR", category: "MARKETING", corpo: "", rodape: "" }); setExemplos({})
        await onRecarregar()
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Templates precisam de aprovação da Meta antes de poder ser usados numa campanha.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogAberto(true)}><Plus size={14} /> Novo template</Button>
      </div>

      {erroTemplates && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle size={14} /> Não foi possível carregar os templates da Meta: {erroTemplates}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead>Usar em campanha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum template ainda.</TableCell></TableRow>
            ) : templates.map((t) => {
              const info = STATUS_TEMPLATE_INFO[t.status] || { label: t.status, tone: "outline" as const }
              const marcado = !!templateTags[t.name]
              return (
                <TableRow key={t.name}>
                  <TableCell className="font-mono text-xs">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.language}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{t.category}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={info.tone} className="gap-1">
                      {t.status === "PENDING" && <Clock size={11} />}
                      {t.status === "REJECTED" && <XIcon size={11} />}
                      {info.label}
                    </Badge>
                    {t.status === "REJECTED" && t.motivoRejeicao && (
                      <p className="text-[11px] text-destructive mt-1 max-w-[220px]">{t.motivoRejeicao}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{t.texto}</TableCell>
                  <TableCell>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={marcado} onCheckedChange={(v) => onAlternarUso(t.name, !!v)} />
                      <span className="text-xs text-muted-foreground">{marcado ? "Sim" : "Não"}</span>
                    </label>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Só templates marcados "Usar em campanha" aparecem na hora de criar uma campanha — assim os templates do Atendimento (como "oi"/"tudo_bem") não se misturam com os de marketing.
        Templates criados por aqui já nascem marcados.
      </p>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} placeholder="Ex.: Promoção de verão" />
              {nomeFinal && <p className="text-[11px] text-muted-foreground mt-1">Vai ser salvo como <code className="bg-muted px-1 rounded">{nomeFinal}</code></p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Idioma</Label>
                <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en_US">Inglês (EUA)</SelectItem>
                    <SelectItem value="es_ES">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as "MARKETING" | "UTILITY" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Corpo da mensagem</Label>
              <Textarea
                rows={4}
                value={form.corpo}
                onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
                placeholder={"Ex.: Olá {{1}}! Temos uma condição especial pra você esse mês."}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Use <code className="bg-muted px-1 rounded">{"{{1}}"}</code>, <code className="bg-muted px-1 rounded">{"{{2}}"}</code>... pra variáveis (ex.: nome do cliente).</p>
            </div>
            {variaveis.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold">Exemplo de cada variável (obrigatório pra Meta aprovar)</p>
                {variaveis.map((v) => (
                  <div key={v}>
                    <Label className="text-xs text-muted-foreground">Exemplo pra {"{{"}{v}{"}}"}</Label>
                    <Input
                      value={exemplos[v] || ""}
                      onChange={(e) => setExemplos((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={v === 1 ? "Ex.: Maria" : "Ex.: valor de exemplo"}
                    />
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label className="text-xs">Rodapé (opcional)</Label>
              <Input value={form.rodape} onChange={(e) => setForm((f) => ({ ...f, rodape: e.target.value }))} placeholder="Ex.: 3W Hotelaria" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              A Meta revisa o conteúdo antes de aprovar (minutos a ~24h) e pode reclassificar a categoria com base no texto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={enviando}>{enviando ? "Enviando…" : "Enviar pra aprovação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
