import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, MessageCircle, Paperclip, Send, X, FileText, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PedidoDados, PedidoItem } from '@/lib/pedidoCastor'
import { carregarPedido, dadosDoPedidoRow, atualizarStatusPedido } from '@/lib/pedidoCastorDb'
import { gerarPedidoPDF, gerarPedidoXlsx, MAX_ITENS_PLANILHA } from '@/lib/pedidoCastorExport'
import {
  LIMITE_EMAIL_MB, acrescentarLinks, enviarEmailPedido, formatarTamanho, hospedarArquivos, incorporavel,
  juntarAoPdf, linkWhatsapp, mensagemEmailPadrao, mensagemWhatsappPadrao,
} from '@/lib/pedidoCastorEnvio'

const db: any = supabase // tabelas novas, fora de integrations/supabase/types.ts
const EMAIL_COMERCIAL = 'comercial1@3whotelaria.com.br'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: string | null
  onSent?: () => void
}

export function EnviarPedidoDialog({ open, onClose, pedidoId, onSent }: Props) {
  const { user } = useAuth() as any
  const inputRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<PedidoDados | null>(null)
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [meta, setMeta] = useState<{ orcamentoId: string; cardId: string | null } | null>(null)
  const [canal, setCanal] = useState<'email' | 'whatsapp'>('email')

  const [destinatarios, setDestinatarios] = useState('')
  const [assunto, setAssunto] = useState('')
  const [msgEmail, setMsgEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [msgZap, setMsgZap] = useState('')
  const [anexos, setAnexos] = useState<File[]>([])
  const [incluirPlanilha, setIncluirPlanilha] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!open || !pedidoId) return
    let cancelado = false
    setCarregando(true)
    setErro(null)
    setAnexos([])
    setIncluirPlanilha(false)
    setCanal('email')
    ;(async () => {
      try {
        const { pedido, itens: its } = await carregarPedido(pedidoId)
        const d = dadosDoPedidoRow(pedido)
        const { data: cab } = await db.from('pedidos_castor').select('fornecedor_id, orcamento_id').eq('id', pedidoId).maybeSingle()
        const [forn, orc] = await Promise.all([
          cab?.fornecedor_id
            ? supabase.from('fornecedores').select('email, whatsapp, telefone').eq('id', cab.fornecedor_id).maybeSingle().then(r => r.data as any)
            : Promise.resolve(null),
          cab?.orcamento_id
            ? supabase.from('orcamentos').select('card_id').eq('id', cab.orcamento_id).maybeSingle().then(r => r.data as any)
            : Promise.resolve(null),
        ])
        if (cancelado) return
        setDados(d)
        setItens(its)
        setMeta({ orcamentoId: cab?.orcamento_id || pedido.orcamento_id, cardId: orc?.card_id || null })
        setDestinatarios([forn?.email, EMAIL_COMERCIAL].filter(Boolean).join(', '))
        setAssunto(`Pedido ${d.numero} - ${d.razao_social} - 3W Hotelaria`)
        setMsgEmail(mensagemEmailPadrao(d, its, false))
        setTelefone(String(forn?.whatsapp || forn?.telefone || ''))
        setMsgZap(mensagemWhatsappPadrao(d, its))
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || 'Erro ao carregar o pedido')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => { cancelado = true }
  }, [open, pedidoId])

  const incorporaveis = anexos.filter(incorporavel)
  const comoLink = anexos.filter(f => !incorporavel(f))
  const totalMB = anexos.reduce((s, f) => s + f.size, 0) / 1048576

  function adicionar(lista: FileList | null) {
    if (!lista) return
    const novos = Array.from(lista).filter(f => {
      if (f.size > 20 * 1048576) { toast.error(`"${f.name}" passa de 20 MB`); return false }
      return true
    })
    setAnexos(p => [...p, ...novos])
    if (inputRef.current) inputRef.current.value = ''
    // atualiza o texto padrão do e-mail se ainda não foi editado manualmente
    if (dados && msgEmail === mensagemEmailPadrao(dados, itens, incorporaveis.length > 0)) {
      const tem = [...anexos, ...novos].some(incorporavel)
      setMsgEmail(mensagemEmailPadrao(dados, itens, tem))
    }
  }

  function remover(i: number) {
    setAnexos(p => p.filter((_, k) => k !== i))
  }

  async function registrar(descricao: string) {
    if (!pedidoId || !dados) return
    try {
      await atualizarStatusPedido(pedidoId, 'enviado')
      if (meta?.cardId) {
        await supabase.from('acoes_comerciais_log').insert({ card_id: meta.cardId, acao: 'pedido_enviado', descricao })
      }
    } catch (e) {
      console.error('Falha ao registrar envio do pedido', e)
    }
  }

  async function enviar() {
    if (!dados || !meta) return
    setEnviando(true)
    try {
      if (canal === 'email') {
        if (!destinatarios.trim()) throw new Error('Informe ao menos um destinatário')
        if (totalMB > LIMITE_EMAIL_MB) throw new Error(`Os anexos somam ${totalMB.toFixed(1)} MB (limite de ${LIMITE_EMAIL_MB} MB por e-mail). Remova algum arquivo ou envie por WhatsApp.`)
        toast.info('Gerando PDF do pedido...')
        const pdfPedido = await gerarPedidoPDF(dados, itens)
        const pdfFinal = incorporaveis.length > 0 ? await juntarAoPdf(pdfPedido, incorporaveis) : pdfPedido

        const extras: { nome: string; blob: Blob }[] = comoLink.map(f => ({ nome: f.name, blob: f }))
        if (incluirPlanilha) {
          const x = await gerarPedidoXlsx(dados, itens)
          extras.push({ nome: `Pedido_Castor_${dados.numero}.xlsx`, blob: new Blob([x], { type: XLSX_MIME }) })
        }
        const links = extras.length ? await hospedarArquivos(extras) : []
        const mensagem = acrescentarLinks(msgEmail, links, 'Arquivos complementares (links):')

        toast.info('Enviando e-mail...')
        await enviarEmailPedido({
          orcamentoId: meta.orcamentoId,
          numero: dados.numero,
          destinatarios: destinatarios,
          assunto,
          mensagem,
          pdf: pdfFinal,
          fromEmail: user?.email || 'sac@3whotelaria.com.br',
        })
        await registrar(`Pedido ${dados.numero} enviado por e-mail para ${destinatarios}`)
        toast.success('Pedido enviado por e-mail')
      } else {
        const pdfPedido = await gerarPedidoPDF(dados, itens)
        const arquivos: { nome: string; blob: Blob }[] = [{ nome: `Pedido_Castor_${dados.numero}.pdf`, blob: pdfPedido }]
        anexos.forEach(f => arquivos.push({ nome: f.name, blob: f }))
        if (incluirPlanilha) {
          const x = await gerarPedidoXlsx(dados, itens)
          arquivos.push({ nome: `Pedido_Castor_${dados.numero}.xlsx`, blob: new Blob([x], { type: XLSX_MIME }) })
        }
        toast.info('Hospedando arquivos...')
        const links = await hospedarArquivos(arquivos)
        const url = linkWhatsapp(telefone, acrescentarLinks(msgZap, links, 'Arquivos:'))
        window.open(url, '_blank')
        await registrar(`Pedido ${dados.numero} enviado por WhatsApp${telefone ? ` para ${telefone}` : ''}`)
        toast.success('WhatsApp aberto com os links do pedido', { description: 'Confirme o envio na janela do WhatsApp.' })
      }
      onSent?.()
      onClose()
    } catch (e: any) {
      console.error(e)
      const msg = e?.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor. Verifique sua conexão.' : e?.message
      toast.error('Erro ao enviar o pedido', { description: msg || 'Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !enviando) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            <Send className="h-5 w-5" /> Enviar pedido {dados && <span className="font-mono text-[#C8962E]">Nº {dados.numero}</span>}
          </DialogTitle>
          <DialogDescription>{dados ? `${dados.razao_social} · envie por e-mail ou WhatsApp, com anexos` : 'Carregando…'}</DialogDescription>
        </DialogHeader>

        {carregando && <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando…</div>}
        {erro && !carregando && (
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /><p>{erro}</p></div>
        )}

        {dados && !carregando && !erro && (
          <div className="space-y-4">
            <Tabs value={canal} onValueChange={v => setCanal(v as 'email' | 'whatsapp')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />E-mail</TabsTrigger>
                <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-3 pt-3">
                <div>
                  <Label>Destinatários</Label>
                  <Input value={destinatarios} onChange={e => setDestinatarios(e.target.value)} placeholder="email1@..., email2@..." />
                  <p className="mt-1 text-xs text-muted-foreground">Separe por vírgula. Vem preenchido com o e-mail do fornecedor Castor e o comercial da 3W.</p>
                </div>
                <div><Label>Assunto</Label><Input value={assunto} onChange={e => setAssunto(e.target.value)} /></div>
                <div><Label>Mensagem</Label><Textarea rows={9} value={msgEmail} onChange={e => setMsgEmail(e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-3 pt-3">
                <div>
                  <Label>Número do WhatsApp</Label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                  <p className="mt-1 text-xs text-muted-foreground">Abre o WhatsApp com a mensagem e os links do PDF e dos anexos. Deixe em branco para escolher o contato lá.</p>
                </div>
                <div><Label>Mensagem</Label><Textarea rows={8} value={msgZap} onChange={e => setMsgZap(e.target.value)} /></div>
              </TabsContent>
            </Tabs>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos (ex.: comprovante de pagamento)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Adicionar arquivos</Button>
                <input ref={inputRef} type="file" multiple className="hidden" aria-label="Adicionar anexos"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={e => adicionar(e.target.files)} />
              </div>

              <div className="flex items-center gap-2 text-sm rounded-md bg-muted/50 px-3 py-2">
                <FileText className="h-4 w-4 text-[#1a4168]" /> <span className="font-medium">Pedido_Castor_{dados.numero}.pdf</span>
                <span className="text-xs text-muted-foreground ml-auto">sempre incluído</span>
              </div>

              {anexos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm rounded-md border px-3 py-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatarTamanho(f.size)}</span>
                  <span className="text-xs shrink-0 text-muted-foreground">
                    {canal === 'email' ? (incorporavel(f) ? '· junto ao PDF' : '· link no e-mail') : '· link'}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" aria-label={`Remover ${f.name}`} onClick={() => remover(i)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}

              {canal === 'email' && incorporaveis.length > 0 && (
                <p className="text-xs text-muted-foreground">PDFs e imagens (JPG/PNG) são incorporados ao final do PDF do pedido, num único anexo.</p>
              )}
              {canal === 'email' && comoLink.length > 0 && (
                <p className="text-xs text-muted-foreground">Arquivos de outros formatos vão como link no corpo do e-mail.</p>
              )}

              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={incluirPlanilha} disabled={itens.length > MAX_ITENS_PLANILHA} onCheckedChange={v => setIncluirPlanilha(!!v)} aria-label="Incluir planilha editável" />
                Incluir também a planilha editável (Excel) {canal === 'email' ? 'como link' : ''}
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onClose} disabled={enviando}>Cancelar</Button>
              <Button onClick={enviar} disabled={enviando} className="bg-[#1a4168] hover:bg-[#15354f] text-white">
                {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : canal === 'email' ? <Mail className="h-4 w-4 mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                {canal === 'email' ? 'Enviar e-mail' : 'Abrir WhatsApp'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
