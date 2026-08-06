import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { apiFetch } from "@/lib/apiFetch"
import { toast } from "sonner"
import { slugifyNomeTemplate, detectarVariaveis } from "@/lib/whatsappTemplates"
import { FileText, Plus, AlertCircle, Clock, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
 * Central de templates do WhatsApp — única tela do sistema onde se cria e
 * classifica um template. A Meta não distingue finalidade de template (é
 * uma lista plana da WABA); a classificação ("Atendimento"/"Campanha") é
 * só nossa, guardada em whatsapp_template_tags, e cada módulo consumidor
 * (Atendimento, Marketing → WhatsApp) filtra pela finalidade certa.
 *
 * Regra de compatibilidade: um template SEM nenhuma finalidade marcada
 * continua aparecendo no Atendimento (é o comportamento de sempre, de
 * antes dessa tela existir) — só some de lá se alguém marcar
 * explicitamente SÓ "Campanha". Já no seletor de Campanhas, a regra é o
 * oposto: só aparece quem tem "Campanha" marcado — sem tag nenhuma, fica
 * de fora (evita misturar template do Atendimento sem querer).
 */

type Finalidade = "atendimento" | "campanha"
type StatusTemplate = "APPROVED" | "PENDING" | "REJECTED" | string

interface Template {
  name: string
  language: string
  category: string
  status: StatusTemplate
  motivoRejeicao?: string
  texto: string
}

const FINALIDADE_LABEL: Record<Finalidade, string> = { atendimento: "Atendimento", campanha: "Campanha" }
const STATUS_TEMPLATE_INFO: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  APPROVED: { label: "Aprovado", tone: "default" },
  PENDING: { label: "Em análise", tone: "secondary" },
  REJECTED: { label: "Rejeitado", tone: "destructive" },
}

export default function AdminTemplatesWhatsApp() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [finalidades, setFinalidades] = useState<Record<string, Finalidade[]>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialogAberto, setDialogAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nomeDigitado, setNomeDigitado] = useState("")
  const [form, setForm] = useState({
    language: "pt_BR", category: "MARKETING" as "MARKETING" | "UTILITY",
    corpo: "", rodape: "", finalidades: new Set<Finalidade>(),
  })
  const [exemplos, setExemplos] = useState<Record<number, string>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [res, tagsRes] = await Promise.all([
        apiFetch("/api/templates?todos=1"),
        supabase.from("whatsapp_template_tags" as any).select("template_nome, finalidades"),
      ])
      const json = await res.json()
      if (json.ok) { setTemplates(json.templates || []); setErro(null) }
      else setErro(json.error || "Falha ao carregar templates")

      const mapa: Record<string, Finalidade[]> = {}
      for (const t of (tagsRes.data as unknown as { template_nome: string; finalidades: Finalidade[] }[]) || []) {
        mapa[t.template_nome] = t.finalidades || []
      }
      setFinalidades(mapa)
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function alternarFinalidade(nome: string, f: Finalidade, ativo: boolean) {
    const atuais = finalidades[nome] || []
    const novas = ativo ? Array.from(new Set([...atuais, f])) : atuais.filter((x) => x !== f)
    const { error } = await supabase.from("whatsapp_template_tags" as any)
      .upsert({ template_nome: nome, finalidades: novas }, { onConflict: "template_nome" })
    if (error) { toast.error(`Erro ao atualizar: ${error.message}`); return }
    setFinalidades((prev) => ({ ...prev, [nome]: novas }))
  }

  const nomeFinal = slugifyNomeTemplate(nomeDigitado)
  const variaveis = detectarVariaveis(form.corpo)

  function toggleFinalidadeForm(f: Finalidade) {
    setForm((prev) => {
      const next = new Set(prev.finalidades)
      if (next.has(f)) next.delete(f); else next.add(f)
      return { ...prev, finalidades: next }
    })
  }

  async function criar() {
    if (!nomeFinal) return toast.error("Dê um nome pro template")
    if (!form.corpo.trim()) return toast.error("Escreva o corpo da mensagem")
    if (form.finalidades.size === 0) return toast.error("Marque pra quê esse template serve (Atendimento e/ou Campanha)")
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
        await supabase.from("whatsapp_template_tags" as any)
          .upsert({ template_nome: nomeFinal, finalidades: Array.from(form.finalidades) }, { onConflict: "template_nome" })
        toast.success('Template enviado! Vai aparecer como "Em análise" até a Meta revisar.')
        setDialogAberto(false)
        setNomeDigitado(""); setForm({ language: "pt_BR", category: "MARKETING", corpo: "", rodape: "", finalidades: new Set() }); setExemplos({})
        await carregar()
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border/60 bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#164B6E] flex items-center justify-center shrink-0">
            <FileText size={20} className="text-[#C4942C]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-heading text-foreground leading-tight">Templates WhatsApp</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crie e classifique templates da WABA aqui — Atendimento e Marketing filtram pela finalidade marcada abaixo.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setDialogAberto(true)}><Plus size={14} /> Novo template</Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle size={14} /> Não foi possível carregar os templates da Meta: {erro}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Sem nenhuma marcação, o template continua visível no Atendimento (comportamento de sempre) — só fica de fora se você marcar explicitamente só "Campanha".
        </p>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Nome</TableHead>
                <TableHead className="w-[110px]">Categoria</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead>Texto</TableHead>
                <TableHead className="w-[190px]">Usado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum template ainda.</TableCell></TableRow>
              ) : templates.map((t) => {
                const info = STATUS_TEMPLATE_INFO[t.status] || { label: t.status, tone: "outline" as const }
                const marcadas = finalidades[t.name] || []
                return (
                  <TableRow key={t.name}>
                    <TableCell>
                      <span className="font-mono text-xs">{t.name}</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">{t.language}</span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={info.tone} className="gap-1">
                        {t.status === "PENDING" && <Clock size={11} />}
                        {t.status === "REJECTED" && <XIcon size={11} />}
                        {info.label}
                      </Badge>
                      {t.status === "REJECTED" && t.motivoRejeicao && (
                        <p className="text-[11px] text-destructive mt-1 max-w-[180px]">{t.motivoRejeicao}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{t.texto}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        {(["atendimento", "campanha"] as Finalidade[]).map((f) => (
                          <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox checked={marcadas.includes(f)} onCheckedChange={(v) => alternarFinalidade(t.name, f, !!v)} />
                            <span className="text-xs text-muted-foreground">{FINALIDADE_LABEL[f]}</span>
                          </label>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} placeholder="Ex.: Promoção de verão" />
              {nomeFinal && <p className="text-[11px] text-muted-foreground mt-1">Vai ser salvo como <code className="bg-muted px-1 rounded">{nomeFinal}</code></p>}
            </div>
            <div>
              <Label className="text-xs">Pra quê serve</Label>
              <div className="flex gap-4 mt-1">
                {(["atendimento", "campanha"] as Finalidade[]).map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.finalidades.has(f)} onCheckedChange={() => toggleFinalidadeForm(f)} />
                    {FINALIDADE_LABEL[f]}
                  </label>
                ))}
              </div>
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
                <Label className="text-xs">Categoria (Meta)</Label>
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
