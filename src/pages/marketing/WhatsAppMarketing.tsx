import { useState, useEffect, useCallback, Fragment } from "react"
import { supabase } from "@/integrations/supabase/client"
import { apiFetch } from "@/lib/apiFetch"
import { useAuth } from "@/components/AuthProvider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Plus, RefreshCw, Send, Users, ShieldCheck, ShieldX, ListChecks,
  ChevronDown, ChevronRight, Trash2, UserPlus, UserMinus, Loader2,
  AlertCircle, Megaphone, PauseCircle,
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

interface Lista {
  id: string
  nome: string
  descricao: string | null
  created_at: string
  total?: number
}

interface Template {
  name: string
  language: string
  category: string
  texto: string
}

interface Campanha {
  id: string
  nome: string
  template_nome: string
  template_idioma: string
  categoria: "marketing" | "utility"
  lista_id: string | null
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

const DELAY_ENTRE_ENVIOS_MS = 350 // pacing conservador — bem abaixo do throughput padrão da Meta (80 msg/s)

export default function WhatsAppMarketing() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState("optin")

  const [optins, setOptins] = useState<OptIn[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [erroTemplates, setErroTemplates] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: optinData }, { data: listaData }, { data: campanhaData }, { data: itensData }] = await Promise.all([
      supabase.from("whatsapp_opt_in" as any).select("*").order("registrado_em", { ascending: false }),
      supabase.from("whatsapp_listas" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_campanhas" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_lista_contatos" as any).select("lista_id"),
    ])
    setOptins((optinData as unknown as OptIn[]) || [])
    const contagem: Record<string, number> = {}
    for (const i of (itensData as unknown as { lista_id: string }[]) || []) {
      contagem[i.lista_id] = (contagem[i.lista_id] || 0) + 1
    }
    setListas(((listaData as unknown as Lista[]) || []).map((l) => ({ ...l, total: contagem[l.id] || 0 })))
    setCampanhas((campanhaData as unknown as Campanha[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    ;(async () => {
      try {
        const res = await apiFetch("/api/templates")
        const json = await res.json()
        if (json.ok) setTemplates(json.templates || [])
        else setErroTemplates(json.error || "Falha ao carregar templates")
      } catch (e) {
        setErroTemplates(String(e))
      }
    })()
  }, [carregar])

  const optinsAtivos = optins.filter((o) => o.status === "opt_in").length
  const optinsOut = optins.filter((o) => o.status === "opt_out").length

  return (
    <div className="p-5 space-y-5">
      {/* ── Stats + aviso de fundação ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={ShieldCheck} label="Opt-in ativos" value={optinsAtivos} tone="good" />
        <StatCard icon={ShieldX} label="Opt-out" value={optinsOut} tone="muted" />
        <StatCard icon={ListChecks} label="Listas" value={listas.length} tone="muted" />
        <StatCard icon={Megaphone} label="Campanhas" value={campanhas.length} tone="muted" />
      </div>

      {optinsAtivos === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Nenhum contato com consentimento registrado ainda.</p>
            <p className="text-xs mt-0.5 opacity-90">
              Por política da Meta, ninguém pode entrar numa lista de campanha sem opt-in explícito.
              Registre consentimento na aba "Consentimento" antes de criar listas e campanhas.
            </p>
          </div>
        </div>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="optin" className="gap-1.5"><ShieldCheck size={14} /> Consentimento</TabsTrigger>
          <TabsTrigger value="listas" className="gap-1.5"><ListChecks size={14} /> Listas</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-1.5"><Megaphone size={14} /> Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="optin" className="mt-4">
          <AbaOptIn optins={optins} loading={loading} perfilId={perfil?.id} onRecarregar={carregar} />
        </TabsContent>

        <TabsContent value="listas" className="mt-4">
          <AbaListas
            listas={listas}
            optins={optins.filter((o) => o.status === "opt_in")}
            loading={loading}
            perfilId={perfil?.id}
            onRecarregar={carregar}
          />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-4">
          <AbaCampanhas
            campanhas={campanhas}
            listas={listas}
            templates={templates}
            erroTemplates={erroTemplates}
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
function AbaOptIn({ optins, loading, perfilId, onRecarregar }: {
  optins: OptIn[]; loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    telefone: "", nome: "", categoria: "promocoes" as Categoria,
    origem: "confirmacao_atendimento" as Origem, observacao: "", confirmo: false,
  })

  async function registrar() {
    if (!form.telefone.trim()) return toast.error("Informe o telefone")
    if (!form.confirmo) return toast.error("Confirme que o consentimento foi de fato coletado")
    setSalvando(true)
    const telefone = normalizarTelefone(form.telefone)
    const { error } = await supabase.from("whatsapp_opt_in" as any).insert({
      telefone, nome: form.nome || null, categoria: form.categoria,
      status: "opt_in", origem: form.origem, observacao: form.observacao || null,
      registrado_por: perfilId,
    })
    setSalvando(false)
    if (error) {
      if (error.code === "23505") toast.error("Este telefone já tem opt-in registrado nessa categoria")
      else toast.error(`Erro ao registrar: ${error.message}`)
      return
    }
    toast.success("Consentimento registrado")
    setDialogAberto(false)
    setForm({ telefone: "", nome: "", categoria: "promocoes", origem: "confirmacao_atendimento", observacao: "", confirmo: false })
    onRecarregar()
  }

  async function alternarStatus(o: OptIn) {
    const novo: StatusOptIn = o.status === "opt_in" ? "opt_out" : "opt_in"
    const { error } = await supabase.from("whatsapp_opt_in" as any).update({ status: novo }).eq("id", o.id)
    if (error) return toast.error("Erro ao atualizar")
    toast.success(novo === "opt_out" ? "Marcado como opt-out" : "Reativado como opt-in")
    onRecarregar()
  }

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
              <Label className="text-xs">Telefone (com DDD)</Label>
              <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as Categoria }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORIA_LABEL) as Categoria[]).map((c) => (
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
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="Ex.: respondeu 'sim' no template de confirmação em 05/08" />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
              <Checkbox checked={form.confirmo} onCheckedChange={(v) => setForm((f) => ({ ...f, confirmo: !!v }))} className="mt-0.5" />
              Confirmo que esta pessoa deu consentimento explícito pra receber mensagens de marketing da 3W — não é um número importado sem confirmação.
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

// ─── Aba Listas ─────────────────────────────────────────────────────────────
function AbaListas({ listas, optins, loading, perfilId, onRecarregar }: {
  listas: Lista[]; optins: OptIn[]; loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogNovaLista, setDialogNovaLista] = useState(false)
  const [nomeLista, setNomeLista] = useState("")
  const [descLista, setDescLista] = useState("")
  const [listaGerenciando, setListaGerenciando] = useState<Lista | null>(null)

  async function criarLista() {
    if (!nomeLista.trim()) return toast.error("Dê um nome pra lista")
    const { error } = await supabase.from("whatsapp_listas" as any).insert({
      nome: nomeLista, descricao: descLista || null, criado_por: perfilId,
    })
    if (error) return toast.error(`Erro: ${error.message}`)
    toast.success("Lista criada")
    setDialogNovaLista(false)
    setNomeLista(""); setDescLista("")
    onRecarregar()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Listas fixas montadas a partir de contatos com opt-in ativo.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogNovaLista(true)}><Plus size={14} /> Nova lista</Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Contatos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : listas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma lista ainda.</TableCell></TableRow>
            ) : listas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{l.descricao || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{l.total ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setListaGerenciando(l)}>Gerenciar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogNovaLista} onOpenChange={setDialogNovaLista}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova lista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={nomeLista} onChange={(e) => setNomeLista(e.target.value)} placeholder="Ex.: Clientes hotelaria — SP" />
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea rows={2} value={descLista} onChange={(e) => setDescLista(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovaLista(false)}>Cancelar</Button>
            <Button onClick={criarLista}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {listaGerenciando && (
        <GerenciarListaDialog
          lista={listaGerenciando}
          optinsDisponiveis={optins}
          onClose={() => setListaGerenciando(null)}
          onMudou={onRecarregar}
        />
      )}
    </div>
  )
}

function GerenciarListaDialog({ lista, optinsDisponiveis, onClose, onMudou }: {
  lista: Lista; optinsDisponiveis: OptIn[]; onClose: () => void; onMudou: () => void
}) {
  const [membros, setMembros] = useState<{ id: string; telefone: string; nome: string | null }[]>([])
  const [loadingMembros, setLoadingMembros] = useState(true)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const carregarMembros = useCallback(async () => {
    setLoadingMembros(true)
    const { data } = await supabase.from("whatsapp_lista_contatos" as any)
      .select("id, telefone, nome").eq("lista_id", lista.id)
    setMembros((data as any) || [])
    setLoadingMembros(false)
  }, [lista.id])

  useEffect(() => { carregarMembros() }, [carregarMembros])

  const telefonesNaLista = new Set(membros.map((m) => m.telefone))
  const disponiveisParaAdicionar = optinsDisponiveis.filter((o) => !telefonesNaLista.has(o.telefone))

  async function adicionarSelecionados() {
    const itens = optinsDisponiveis
      .filter((o) => selecionados.has(o.telefone))
      .map((o) => ({ lista_id: lista.id, telefone: o.telefone, nome: o.nome }))
    if (itens.length === 0) return
    const { error } = await supabase.from("whatsapp_lista_contatos" as any).insert(itens)
    if (error) {
      toast.error(`Erro ao adicionar (verifique se todos têm opt-in ativo): ${error.message}`)
      return
    }
    toast.success(`${itens.length} contato(s) adicionado(s)`)
    setSelecionados(new Set())
    carregarMembros()
    onMudou()
  }

  async function remover(id: string) {
    const { error } = await supabase.from("whatsapp_lista_contatos" as any).delete().eq("id", id)
    if (error) return toast.error("Erro ao remover")
    carregarMembros()
    onMudou()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle>Gerenciar lista — {lista.nome}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="flex flex-col min-h-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Disponíveis (opt-in ativo, fora da lista)
            </p>
            <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border/60">
              {disponiveisParaAdicionar.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Nenhum contato disponível.</p>
              ) : disponiveisParaAdicionar.map((o) => (
                <label key={o.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                  <Checkbox
                    checked={selecionados.has(o.telefone)}
                    onCheckedChange={(v) => setSelecionados((prev) => {
                      const next = new Set(prev)
                      if (v) next.add(o.telefone); else next.delete(o.telefone)
                      return next
                    })}
                  />
                  <span className="truncate">{o.nome || o.telefone} <span className="text-muted-foreground text-xs font-mono">{o.telefone}</span></span>
                </label>
              ))}
            </div>
            <Button size="sm" className="mt-2 gap-1.5" disabled={selecionados.size === 0} onClick={adicionarSelecionados}>
              <UserPlus size={14} /> Adicionar {selecionados.size > 0 ? `(${selecionados.size})` : ""}
            </Button>
          </div>
          <div className="flex flex-col min-h-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Membros da lista ({membros.length})
            </p>
            <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border/60">
              {loadingMembros ? (
                <p className="text-xs text-muted-foreground p-3">Carregando…</p>
              ) : membros.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Vazia.</p>
              ) : membros.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate">{m.nome || m.telefone} <span className="text-muted-foreground text-xs font-mono">{m.telefone}</span></span>
                  <Button variant="ghost" size="sm" onClick={() => remover(m.id)}><UserMinus size={14} /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Aba Campanhas ──────────────────────────────────────────────────────────
function AbaCampanhas({ campanhas, listas, templates, erroTemplates, loading, perfilId, onRecarregar }: {
  campanhas: Campanha[]; listas: Lista[]; templates: Template[]; erroTemplates: string | null
  loading: boolean; perfilId?: string; onRecarregar: () => void
}) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({ nome: "", template: "", lista_id: "" })
  const [expandida, setExpandida] = useState<string | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)

  const templateEscolhido = templates.find((t) => t.name === form.template)

  async function criarCampanha() {
    if (!form.nome.trim()) return toast.error("Dê um nome pra campanha")
    if (!form.template) return toast.error("Escolha um template aprovado")
    if (!form.lista_id) return toast.error("Escolha uma lista")
    setCriando(true)

    const { data: campanha, error } = await supabase.from("whatsapp_campanhas" as any).insert({
      nome: form.nome, template_nome: form.template, template_idioma: templateEscolhido?.language || "pt_BR",
      categoria: (templateEscolhido?.category || "marketing").toLowerCase(),
      lista_id: form.lista_id, status: "rascunho", criado_por: perfilId,
    }).select().single()

    if (error || !campanha) {
      setCriando(false)
      return toast.error(`Erro ao criar campanha: ${error?.message}`)
    }

    // Prepara envios: copia membros da lista que ainda têm opt-in ativo agora.
    const { data: membros } = await supabase.from("whatsapp_lista_contatos" as any)
      .select("telefone, nome").eq("lista_id", form.lista_id)
    const { data: optinsAtivos } = await supabase.from("whatsapp_opt_in" as any)
      .select("telefone").eq("status", "opt_in")
    const telefonesValidos = new Set((optinsAtivos as unknown as { telefone: string }[] || []).map((o) => o.telefone))
    const elegiveis = ((membros as unknown as { telefone: string; nome: string | null }[]) || [])
      .filter((m) => telefonesValidos.has(m.telefone))

    if (elegiveis.length > 0) {
      await supabase.from("whatsapp_campanha_envios" as any).insert(
        elegiveis.map((m) => ({ campanha_id: (campanha as any).id, telefone: m.telefone, nome: m.nome, status: "pendente" })),
      )
    }
    await supabase.from("whatsapp_campanhas" as any).update({
      total_destinatarios: elegiveis.length, status: elegiveis.length > 0 ? "pronta" : "rascunho",
    }).eq("id", (campanha as any).id)

    setCriando(false)
    toast.success(elegiveis.length > 0
      ? `Campanha pronta com ${elegiveis.length} destinatário(s)`
      : "Campanha criada, mas a lista não tem contatos elegíveis ainda")
    setDialogAberto(false)
    setForm({ nome: "", template: "", lista_id: "" })
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
        <p className="text-sm text-muted-foreground">Broadcast simples: 1 template aprovado para 1 lista fixa.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogAberto(true)}><Plus size={14} /> Nova campanha</Button>
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
              <TableHead></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            ) : campanhas.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma campanha ainda.</TableCell></TableRow>
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
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Promoção agosto — hotelaria SP" />
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
              <Label className="text-xs">Lista</Label>
              <Select value={form.lista_id} onValueChange={(v) => setForm((f) => ({ ...f, lista_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolha uma lista" /></SelectTrigger>
                <SelectContent>
                  {listas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome} ({l.total ?? 0} contatos)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      <TableCell colSpan={6} className="bg-muted/30 p-0">
        <div className="max-h-64 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando envios…</p>
          ) : envios.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum envio ainda — a lista não tinha contatos elegíveis no momento da criação.</p>
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
