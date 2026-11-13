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
import { emailValido, whatsappValido } from '@/components/fornecedores/PedidoEnvioFornecedor'
import { carregarPedido, dadosDoPedidoRow, atualizarStatusPedido } from '@/lib/pedidoCastorDb'
import { gerarPedidoPDF, gerarPedidoXlsx, MAX_ITENS_PLANILHA } from '@/lib/pedidoCastorExport'
import {
  LIMITE_EMAIL_MB, acrescentarLinks, enviarEmailPedido, formatarTamanho, hospedarArquivos, incorporavel,
  juntarAoPdf, linkWhatsapp, mensagemEmailPadrao, mensagemWhatsappPadrao,
} from '@/lib/pedidoCastorEnvio'

const db: any = supabase // tabelas novas, fora de integrations/supabase/types.ts
const EMAIL_COMERCIAL = 'comercial1@3whotelaria.com.br'
type Modo = 'auto' | 'manual'

function ModoDestino({ valor, onChange, temCadastro }: { valor: Modo; onChange: (m: Modo) => void; temCadastro: boolean }) {
  const base = 'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors'
  const ativo = 'bg-[#1a4168] text-white border-[#1a4168]'
  const inativo = 'bg-background text-foreground hover:bg-muted'
  return (
    <div className="flex gap-2" role="group" aria-label="Origem dos destinatários">
      <button type="button" aria-pressed={valor === 'auto'} disabled={!temCadastro} onClick={() => onChange('auto')}
        className={`${base} ${valor === 'auto' ? ativo : inativo} disabled:opacity-50 disabled:cursor-not-allowed`}>
        Automático (cadastro do fornecedor)
      </button>
      <button type="button" aria-pressed={valor === 'manual'} onClick={() => onChange('manual')} className={`${base} ${valor === 'manual' ? ativo : inativo}`}>
        Manual
      </button>
    </div>
  )
}

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

  const [emailsCadastro, setEmailsCadastro] = useState<string[]>([])
  const [zapsCadastro, setZapsCadastro] = useState<string[]>([])
  const [modoEmail, setModoEmail] = useState<Modo>('manual')
  const [modoZap, setModoZap] = useState<Modo>('manual')
  const [zapsMarcados, setZapsMarcados] = useState<string[]>([])
  const [copiaComercial, setCopiaComercial] = useState(true)
  const [prontos, setProntos] = useState<{ numero: string; url: string }[] | null>(null)
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
    setProntos(null)
    ;(async () => {
      try {
        const { pedido, itens: its } = await carregarPedido(pedidoId)
        const d = dadosDoPedidoRow(pedido)
        const { data: cab } = await db.from('pedidos_castor').select('fornecedor_id, orcamento_id').eq('id', pedidoId).maybeSingle()
        const [forn, orc] = await Promise.all([
          cab?.fornecedor_id
            ? supabase.from('fornecedores').select('email, whatsapp, telefone, pedido_emails, pedido_whatsapps').eq('id', cab.fornecedor_id).maybeSingle().then(r => r.data as any)
            : Promise.resolve(null),
          cab?.orcamento_id
            ? supabase.from('orcamentos').select('card_id').eq('id', cab.orcamento_id).maybeSingle().then(r => r.data as any)
            : Promise.resolve(null),
        ])
        if (cancelado) return
        setDados(d)
        setItens(its)
        setMeta({ orcamentoId: cab?.orcamento_id || pedido.orcamento_id, cardId: orc?.card_id || null })
        const ems: string[] = (forn?.pedido_emails as string[]) || []
        const zps: string[] = (forn?.pedido_whatsapps as string[]) || []
        setEmailsCadastro(ems)
        setZapsCadastro(zps)
        setModoEmail(ems.length ? 'auto' : 'manual')
        setModoZap(zps.length ? 'auto' : 'manual')
        setZapsMarcados(zps)
        setCopiaComercial(true)
        setDestinatarios(forn?.email || '')
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
        const lista = modoEmail === 'auto' ? [...emailsCadastro] : destinatarios.split(/[,;\s]+/).filter(Boolean)
        if (copiaComercial && !lista.includes(EMAIL_COMERCIAL)) lista.push(EMAIL_COMERCIAL)
        if (lista.length === 0) throw new Error('Informe ao menos um destinatário')
        const invalido = lista.find(e => !emailValido(e))
        if (invalido) throw new Error(`E-mail inválido: ${invalido}`)
        const destinatariosFinal = lista.join(', ')
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
          destinatarios: destinatariosFinal,
          assunto,
          mensagem,
          pdf: pdfFinal,
          fromEmail: user?.email || 'sac@3whotelaria.com.br',
        })
        await registrar(`Pedido ${dados.numero} enviado por e-mail para ${destinatariosFinal}`)
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
        const texto = acrescentarLinks(msgZap, links, 'Arquivos:')
        const numeros = modoZap === 'auto' ? zapsMarcados : telefone.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
        if (modoZap === 'auto' && numeros.length === 0) throw new Error('Selecione ao menos um número de WhatsApp')
        const invalido = numeros.find(n => !whatsappValido(n))
        if (invalido) throw new Error(`Número de WhatsApp inválido: ${invalido}`)
        await registrar(`Pedido ${dados.numero} enviado por WhatsApp${numeros.length ? ` para ${numeros.join(', ')}` : ''}`)
        if (numeros.length > 1) {
          // vários números: o navegador só abre uma janela por clique — cada número vira um botão
          setProntos(numeros.map(n => ({ numero: n, url: linkWhatsapp(n, texto) })))
          toast.success('Arquivos prontos. Clique em cada número para abrir o WhatsApp.')
          onSent?.()
          return
        }
        window.open(linkWhatsapp(numeros[0] || '', texto), '_blank')
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
                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <ModoDestino valor={modoEmail} onChange={setModoEmail} temCadastro={emailsCadastro.length > 0} />
                  {modoEmail === 'auto' ? (
                    <ul className="rounded-md border bg-muted/30 p-2 text-sm space-y-1" aria-label="E-mails cadastrados">
                      {emailsCadastro.map(e => <li key={e} className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{e}</li>)}
                    </ul>
                  ) : (
                    <Input value={destinatarios} onChange={e => setDestinatarios(e.target.value)} placeholder="email1@..., email2@..." aria-label="Destinatários manuais" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {modoEmail === 'auto' ? 'Todos os e-mails de pedidos cadastrados no fornecedor (Fornecedores › Pedidos).' : 'Separe por vírgula.'}
                    {emailsCadastro.length === 0 && ' Este fornecedor ainda não tem e-mails de pedidos cadastrados.'}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={copiaComercial} onCheckedChange={v => setCopiaComercial(!!v)} aria-label="Enviar cópia ao comercial" />
                    Enviar cópia para {EMAIL_COMERCIAL}
                  </label>
                </div>
                <div><Label>Assunto</Label><Input value={assunto} onChange={e => setAssunto(e.target.value)} /></div>
                <div><Label>Mensagem</Label><Textarea rows={9} value={msgEmail} onChange={e => setMsgEmail(e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Números do WhatsApp</Label>
                  <ModoDestino valor={modoZap} onChange={setModoZap} temCadastro={zapsCadastro.length > 0} />
                  {modoZap === 'auto' ? (
                    <div className="rounded-md border bg-muted/30 p-2 space-y-1.5" aria-label="WhatsApp cadastrados">
                      {zapsCadastro.map(n => (
                        <label key={n} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={zapsMarcados.includes(n)}
                            onCheckedChange={v => setZapsMarcados(p => (v ? [...new Set([...p, n])] : p.filter(x => x !== n)))}
                            aria-label={`Enviar para ${n}`}
                          />
                          {n}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999, (11) 98888-7777" aria-label="Números manuais" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {modoZap === 'auto' ? 'Números de pedidos cadastrados no fornecedor (Fornecedores › Pedidos). Desmarque os que não devem receber.' : 'Separe vários números por vírgula. Em branco, você escolhe o contato no WhatsApp.'}
                    {zapsCadastro.length === 0 && ' Este fornecedor ainda não tem WhatsApp de pedidos cadastrado.'}
                  </p>
                </div>
                <div><Label>Mensagem</Label><Textarea rows={8} value={msgZap} onChange={e => setMsgZap(e.target.value)} /></div>
                {prontos && (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 space-y-2">
                    <p className="text-sm font-medium text-emerald-900">Arquivos hospedados. Abra o WhatsApp de cada número:</p>
                    <div className="flex flex-wrap gap-2">
                      {prontos.map(p => (
                        <a key={p.numero} href={p.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                          <MessageCircle className="h-4 w-4" /> {p.numero}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
