import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Send, FileDown, FileSpreadsheet, AlertTriangle, ShoppingCart } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PedidoDados, PedidoItem, calcularTotais, num, moeda, numeroBR, dataBR,
  opcoesCondicoesPagamento, opcoesPrazoEntrega, totalComDescItem, totalSemDescItem, OpcaoCondicao,
} from '@/lib/pedidoCastor'
import {
  carregarContextoOrcamento, carregarPedido, buscarPedidoPorOrcamento, montarPedidoNovo, salvarPedido,
  ContextoOrcamento,
} from '@/lib/pedidoCastorDb'
import { digitosCodigo } from '@/components/pedidos/PedidoCastorPrint'
import { EnviarPedidoDialog } from '@/components/pedidos/EnviarPedidoDialog'
import { baixarPedidoPDF, baixarPedidoXlsx, MAX_ITENS_PLANILHA } from '@/lib/pedidoCastorExport'

interface Props {
  open: boolean
  onClose: () => void
  orcamentoId?: string | null
  pedidoId?: string | null
  onSaved?: () => void
}

const AZUL = 'text-[#1a4168]'
const OUTROS = '__outros__'

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card overflow-hidden">
      <header className="bg-[#1a4168] px-4 py-2 border-b-2 border-[#C8962E]">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-white">{titulo}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className={`text-[11px] font-semibold uppercase tracking-wide ${AZUL}`}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Auto({ value }: { value: string }) {
  return <Input readOnly tabIndex={-1} value={value} className="bg-muted/60 text-foreground cursor-default" />
}

// Campo de percentual (aceita vírgula) — guarda o texto enquanto digita
function PctInput({ value, onChange, ariaLabel }: { value: number; onChange: (n: number) => void; ariaLabel: string }) {
  const [texto, setTexto] = useState<string | null>(null)
  return (
    <div className="relative">
      <Input
        aria-label={ariaLabel}
        inputMode="decimal"
        className="h-9 pr-6 text-right bg-[#fbf1dc]/60 border-[#C8962E]/50"
        value={texto ?? String(value).replace('.', ',')}
        onFocus={e => { setTexto(String(value).replace('.', ',')); e.target.select() }}
        onChange={e => { setTexto(e.target.value); onChange(Math.min(100, Math.max(0, num(e.target.value)))) }}
        onBlur={() => setTexto(null)}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
    </div>
  )
}

function MoedaInput({ value, onChange, ariaLabel }: { value: number; onChange: (n: number) => void; ariaLabel: string }) {
  const [texto, setTexto] = useState<string | null>(null)
  return (
    <Input
      aria-label={ariaLabel}
      inputMode="decimal"
      placeholder="R$ 0,00"
      className="text-right"
      value={texto ?? (value ? numeroBR(value) : '')}
      onFocus={() => setTexto(value ? String(value).replace('.', ',') : '')}
      onChange={e => { setTexto(e.target.value); onChange(Math.max(0, num(e.target.value))) }}
      onBlur={() => setTexto(null)}
    />
  )
}

export function PedidoCastorModal({ open, onClose, orcamentoId, pedidoId, onSaved }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ctx, setCtx] = useState<ContextoOrcamento | null>(null)
  const [dados, setDados] = useState<PedidoDados | null>(null)
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [idSalvo, setIdSalvo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [exportando, setExportando] = useState<'pdf' | 'xlsx' | null>(null)
  const [enviarId, setEnviarId] = useState<string | null>(null)
  const [prazoOutros, setPrazoOutros] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelado = false
    setCarregando(true)
    setErro(null)
    setCtx(null)
    setDados(null)
    setItens([])
    setIdSalvo(null)
    setPrazoOutros(false)
    ;(async () => {
      try {
        let oId = orcamentoId || null
        let existente: Awaited<ReturnType<typeof carregarPedido>> | null = null
        if (pedidoId) {
          existente = await carregarPedido(pedidoId)
          oId = existente.pedido.orcamento_id
        } else if (oId) {
          const achado = await buscarPedidoPorOrcamento(oId)
          if (achado) existente = await carregarPedido(achado.id)
        }
        if (!oId) throw new Error('Pedido sem orçamento de origem')
        const c = await carregarContextoOrcamento(oId)
        if (cancelado) return
        if (!c.ehCastor) throw new Error('O módulo de pedidos está disponível apenas para orçamentos Castor por enquanto.')
        setCtx(c)
        if (existente) {
          const { pedido, itens: its } = existente
          const { id, orcamento_id, cliente_id, status, total_pedido, desconto_itens, total, created_at, updated_at, ...resto } = pedido as any
          void orcamento_id; void cliente_id; void status; void total_pedido; void desconto_itens; void total; void created_at; void updated_at
          setDados(resto as PedidoDados)
          setItens(its)
          setIdSalvo(id)
          const prazoSalvo = String((resto as any).prazo_entrega || '')
          setPrazoOutros(!!prazoSalvo && !opcoesPrazoEntrega(c.orcamento.prazo_entrega).includes(prazoSalvo))
        } else {
          if (!['aprovado', 'consolidado'].includes(String(c.orcamento.status))) {
            throw new Error('O pedido só pode ser criado a partir de um orçamento aprovado. Marque o orçamento como Aprovado primeiro.')
          }
          const novo = montarPedidoNovo(c)
          if (novo.itens.length === 0) throw new Error('O orçamento não tem itens para gerar o pedido.')
          setDados(novo.dados)
          setItens(novo.itens)
        }
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || 'Erro ao carregar o pedido')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => { cancelado = true }
  }, [open, orcamentoId, pedidoId])

  const opcoesPagamento: OpcaoCondicao[] = useMemo(() => {
    if (!ctx) return []
    const base = opcoesCondicoesPagamento(ctx.orcamento.condicoes_pagamento)
    if (dados && dados.condicoes_pagamento && !base.some(o => o.valor === dados.condicoes_pagamento)) {
      base.push({ valor: dados.condicoes_pagamento, rotulo: dados.condicoes_pagamento, acrescimo: dados.acrescimo_fin_pct })
    }
    return base
  }, [ctx, dados?.condicoes_pagamento]) // eslint-disable-line react-hooks/exhaustive-deps

  const opcoesPrazo = useMemo(() => {
    if (!ctx) return []
    return opcoesPrazoEntrega(ctx.orcamento.prazo_entrega)
  }, [ctx])

  const totais = useMemo(() => (dados ? calcularTotais(itens, dados) : null), [itens, dados])

  const setD = <K extends keyof PedidoDados>(k: K, v: PedidoDados[K]) => setDados(p => (p ? { ...p, [k]: v } : p))
  const setItem = (id: string, patch: Partial<PedidoItem>) => setItens(p => p.map(i => (i.id === id ? { ...i, ...patch } : i)))

  async function salvar(): Promise<string | null> {
    if (!dados || !ctx) return null
    if (!dados.numero.trim()) { toast.error('Informe o número do pedido'); return null }
    if (prazoOutros && !dados.prazo_entrega.trim()) { toast.error('Informe o prazo de entrega combinado'); return null }
    setSalvando(true)
    try {
      const id = await salvarPedido({ pedidoId: idSalvo, orcamento: ctx.orcamento, dados, itens })
      setIdSalvo(id)
      toast.success(`Pedido ${dados.numero} salvo`)
      onSaved?.()
      return id
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Erro ao salvar o pedido')
      return null
    } finally {
      setSalvando(false)
    }
  }

  // Envia sempre a versão salva: grava as alterações antes de abrir o envio
  async function abrirEnvio() {
    const id = await salvar()
    if (id) setEnviarId(id)
  }

  async function exportar(tipo: 'pdf' | 'xlsx') {
    if (!dados) return
    setExportando(tipo)
    try {
      if (tipo === 'pdf') await baixarPedidoPDF(dados, itens)
      else await baixarPedidoXlsx(dados, itens)
      if (!idSalvo) toast.info('Arquivo gerado. Lembre-se de salvar o pedido no sistema.')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Erro ao gerar o arquivo')
    } finally {
      setExportando(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            <ShoppingCart className="h-5 w-5" /> {idSalvo ? 'Pedido Castor' : 'Novo Pedido Castor'}
            {dados && <span className="font-mono text-[#C8962E]">Nº {dados.numero}</span>}
          </DialogTitle>
          <DialogDescription>
            {ctx ? `Orçamento ${ctx.orcamento.numero} · ${ctx.orcamento.cliente_nome || ''}` : 'Pedido gerado a partir de um orçamento aprovado'}
          </DialogDescription>
        </DialogHeader>

        {carregando && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando orçamento...
          </div>
        )}

        {erro && !carregando && (
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" /> <p>{erro}</p>
          </div>
        )}

        {dados && totais && ctx && !carregando && !erro && (
          <div className="space-y-4">
            <Secao titulo="Pedido">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Campo label="Pedido Nº"><Input value={dados.numero} onChange={e => setD('numero', e.target.value)} /></Campo>
                <Campo label="Data (aprovação do orçamento)"><Auto value={dataBR(dados.data_pedido)} /></Campo>
                <Campo label="Vend. Repres."><Auto value={dados.vend_repres} /></Campo>
                <Campo label="Tabela"><Auto value={dados.tabela} /></Campo>
                <Campo label="Cliente Nº"><Input value={dados.cliente_numero} onChange={e => setD('cliente_numero', e.target.value)} /></Campo>
                <Campo label="TPOP"><Input value={dados.tpop} onChange={e => setD('tpop', e.target.value)} /></Campo>
                <Campo label="Cod. Mensagens"><Input value={dados.cod_mensagens} onChange={e => setD('cod_mensagens', e.target.value)} /></Campo>
                <Campo label="Código Fat."><Input value={dados.codigo_fat} onChange={e => setD('codigo_fat', e.target.value)} /></Campo>
                <Campo label="Condições de Pagamento" className="col-span-2">
                  <Select
                    value={dados.condicoes_pagamento}
                    onValueChange={v => {
                      const op = opcoesPagamento.find(o => o.valor === v)
                      setDados(p => (p ? { ...p, condicoes_pagamento: v, acrescimo_fin_pct: op ? op.acrescimo : p.acrescimo_fin_pct } : p))
                    }}
                  >
                    <SelectTrigger aria-label="Condições de pagamento" className="bg-[#fff4d6]/70 border-[#C8962E]/60 font-semibold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {opcoesPagamento.map(o => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Prazo de Entrega" className="col-span-2">
                  <Select
                    value={prazoOutros ? OUTROS : dados.prazo_entrega}
                    onValueChange={v => {
                      if (v === OUTROS) { setPrazoOutros(true); setD('prazo_entrega', '') }
                      else { setPrazoOutros(false); setD('prazo_entrega', v) }
                    }}
                  >
                    <SelectTrigger aria-label="Prazo de entrega" className="font-semibold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {opcoesPrazo.map(o => <SelectItem key={o} value={o}>{/^\d+$/.test(o) ? `${o} dias` : o}</SelectItem>)}
                      <SelectItem value={OUTROS}>Outros (prazo combinado)</SelectItem>
                    </SelectContent>
                  </Select>
                  {prazoOutros && (
                    <Input
                      className="mt-2"
                      aria-label="Prazo combinado"
                      placeholder="Prazo combinado (ex.: 50, 20/40 dias, a combinar)"
                      value={dados.prazo_entrega}
                      onChange={e => setD('prazo_entrega', e.target.value)}
                    />
                  )}
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Cliente">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Campo label="Razão Social" className="col-span-2 md:col-span-4"><Auto value={dados.razao_social} /></Campo>
                <Campo label="CNPJ (MF)" className="col-span-2"><Auto value={dados.cnpj} /></Campo>
                <Campo label="Endereço" className="col-span-2 md:col-span-4"><Auto value={dados.endereco} /></Campo>
                <Campo label="Bairro" className="col-span-2"><Auto value={dados.bairro} /></Campo>
                <Campo label="Cidade" className="col-span-2"><Auto value={dados.cidade} /></Campo>
                <Campo label="Estado"><Auto value={dados.estado} /></Campo>
                <Campo label="CEP"><Auto value={dados.cep} /></Campo>
                <Campo label="Fone"><Auto value={dados.fone} /></Campo>
                <Campo label="Inscrição Estadual"><Input value={dados.inscricao_estadual} onChange={e => setD('inscricao_estadual', e.target.value)} /></Campo>
                <Campo label="End. Cobrança" className="col-span-2 md:col-span-6"><Auto value={dados.end_cobranca} /></Campo>
              </div>
            </Secao>

            <Secao titulo="Local de Entrega">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Campo label="Endereço" className="col-span-2 md:col-span-6"><Auto value={dados.entrega_endereco} /></Campo>
                <Campo label="CNPJ" className="col-span-2"><Auto value={dados.entrega_cnpj} /></Campo>
                <Campo label="Cidade" className="col-span-2"><Auto value={dados.entrega_cidade} /></Campo>
                <Campo label="Estado"><Auto value={dados.entrega_estado} /></Campo>
                <Campo label="CEP"><Auto value={dados.entrega_cep} /></Campo>
                <Campo label="Inscrição Estadual" className="col-span-2"><Input value={dados.entrega_ie} onChange={e => setD('entrega_ie', e.target.value)} /></Campo>
              </div>
            </Secao>

            <Secao titulo="Itens do pedido">
              {itens.length > MAX_ITENS_PLANILHA && (
                <p className="mb-3 text-xs text-amber-700">
                  O modelo de planilha Castor comporta {MAX_ITENS_PLANILHA} itens; o PDF comporta todos, mas a planilha não será gerada.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1a4168] text-white text-[11px] uppercase tracking-wide">
                      <th className="p-2 w-10">Item</th>
                      <th className="p-2" colSpan={5}>Código</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 w-16">Quant.</th>
                      <th className="p-2 w-28 text-right">R$ Unit</th>
                      <th className="p-2 w-20">Desc.1</th>
                      <th className="p-2 w-24">Desc.2</th>
                      <th className="p-2 w-24">Desc.3</th>
                      <th className="p-2 w-28 text-right">Total c/ desc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it, k) => (
                      <tr key={it.id} className="border-b align-middle">
                        <td className="p-2 text-center font-semibold text-[#1a4168]">{k + 1}</td>
                        {digitosCodigo(it.codigo).map((d, j) => (
                          <td key={j} className="w-7 border-x border-slate-200 px-0 py-2 text-center font-semibold">{d}</td>
                        ))}
                        <td className="p-2 whitespace-pre-line text-xs text-muted-foreground leading-snug">{it.descricao}</td>
                        <td className="p-2 text-center font-semibold">{it.quantidade}</td>
                        <td className="p-2 text-right font-semibold bg-[#e6eef7]/70 whitespace-nowrap" title="Valor de referência + acréscimo do estado">
                          {moeda(it.preco_unitario)}
                        </td>
                        <td className="p-2 text-center bg-muted/60" title="Desconto do estado">{String(it.desconto1_pct).replace('.', ',')}%</td>
                        <td className="p-2"><PctInput ariaLabel={`Desc.2 do item ${k + 1}`} value={it.desconto2_pct} onChange={n => setItem(it.id, { desconto2_pct: n })} /></td>
                        <td className="p-2"><PctInput ariaLabel={`Desc.3 do item ${k + 1}`} value={it.desconto3_pct} onChange={n => setItem(it.id, { desconto3_pct: n })} /></td>
                        <td className="p-2 text-right font-semibold whitespace-nowrap">{moeda(totalComDescItem(it))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1a4168] text-white font-semibold">
                      <td colSpan={7} className="p-2 text-center">Total</td>
                      <td className="p-2 text-center">{totais.quantidade}</td>
                      <td className="p-2 text-right whitespace-nowrap">{moeda(totais.totalSemDesc)}</td>
                      <td colSpan={3} />
                      <td className="p-2 text-right whitespace-nowrap bg-[#C8962E]">{moeda(totais.totalComDesc)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Secao>

            <div className="grid md:grid-cols-[1fr_320px] gap-4">
              <Secao titulo="Observações">
                <Textarea
                  rows={6}
                  value={dados.observacoes}
                  onChange={e => setD('observacoes', e.target.value)}
                  placeholder="Uma observação por linha. A primeira linha fica em destaque no pedido."
                />
              </Secao>
              <Secao titulo="Totais">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Total Pedido</dt><dd className="font-semibold">{moeda(totais.totalSemDesc)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Desconto</dt><dd className="font-semibold">{moeda(totais.descontoItens)}</dd></div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Desconto adicional</dt>
                    <dd className="w-32"><MoedaInput ariaLabel="Desconto adicional" value={dados.desconto_adicional} onChange={n => setD('desconto_adicional', n)} /></dd>
                  </div>
                  <div className="flex justify-between border-t pt-2"><dt className="text-muted-foreground">Sub Total</dt><dd className="font-semibold">{moeda(totais.subTotal)}</dd></div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">IPI</dt>
                    <dd className="w-32"><MoedaInput ariaLabel="IPI" value={dados.ipi} onChange={n => setD('ipi', n)} /></dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Acrésc. Finan. %</dt>
                    <dd className="w-32"><PctInput ariaLabel="Acréscimo financeiro" value={dados.acrescimo_fin_pct} onChange={n => setD('acrescimo_fin_pct', n)} /></dd>
                  </div>
                  <div className="flex justify-between items-center rounded-md bg-[#1a4168] px-3 py-2 text-white">
                    <dt className="font-semibold">Total</dt>
                    <dd className="text-lg font-bold text-[#C8962E]">{moeda(totais.total)}</dd>
                  </div>
                </dl>
              </Secao>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Vendedor/Repres. e Data vêm do orçamento; Desc.1 e R$ Unit seguem a região do cliente.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => exportar('xlsx')} disabled={!!exportando || itens.length > MAX_ITENS_PLANILHA}
                  className="border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168] hover:text-white">
                  {exportando === 'xlsx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                  Planilha editável
                </Button>
                <Button variant="outline" onClick={() => exportar('pdf')} disabled={!!exportando}
                  className="border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168] hover:text-white">
                  {exportando === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Baixar PDF
                </Button>
                <Button variant="outline" onClick={abrirEnvio} disabled={salvando}
                  className="border-[#C8962E] text-[#8a6417] hover:bg-[#C8962E] hover:text-white">
                  <Send className="h-4 w-4 mr-2" /> Enviar pedido
                </Button>
                <Button onClick={() => { void salvar() }} disabled={salvando} className="bg-[#1a4168] hover:bg-[#15354f] text-white">
                  {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {idSalvo ? 'Salvar alterações' : 'Salvar pedido'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      <EnviarPedidoDialog
        open={!!enviarId}
        pedidoId={enviarId}
        onClose={() => setEnviarId(null)}
        onSent={() => { onSaved?.() }}
      />
    </Dialog>
  )
}
