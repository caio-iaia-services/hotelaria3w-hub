import { supabase } from '@/lib/supabase'
import { Orcamento, OrcamentoItem } from '@/lib/types'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Eye, Send, Edit, Download,
  Trash2, Filter, Search, Printer, X, Mail, MessageCircle, ChevronDown
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { OrcamentoTemplate } from '@/components/OrcamentoTemplate'
import { EditarOrcamentoModal } from '@/components/orcamentos/EditarOrcamentoModal'

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    rascunho: 'secondary',
    enviado: 'default',
    aprovado: 'default',
    rejeitado: 'destructive',
    expirado: 'secondary'
  }
  return variants[status] || 'secondary'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    enviado: 'Enviado',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    expirado: 'Expirado'
  }
  return labels[status] || status
}

function parseNum(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const str = String(value).trim()
  if (str.includes(',')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

function formatCurrency(value: any) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseNum(value))
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [statusAtivo, setStatusAtivo] = useState('todos')
  const [contadores, setContadores] = useState({
    todos: 0, rascunho: 0, enviado: 0, aprovado: 0, rejeitado: 0, expirado: 0
  })
  const [filtros, setFiltros] = useState({ busca: '', gestao: '' })
  const [modalVisualizar, setModalVisualizar] = useState(false)
  const [orcamentoVisualizar, setOrcamentoVisualizar] = useState<Orcamento | null>(null)
  const [itensVisualizar, setItensVisualizar] = useState<OrcamentoItem[]>([])
  const [totaisItensFallback, setTotaisItensFallback] = useState<Record<string, number>>({})
  const [modalEditar, setModalEditar] = useState(false)
  const [orcamentoEditarId, setOrcamentoEditarId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getTotalExibicao = useCallback((orcamento: Orcamento) => {
    const totalDireto = parseNum((orcamento as any).total)
    if (totalDireto > 0) return totalDireto

    const subtotal = parseNum((orcamento as any).subtotal)
    const frete = parseNum((orcamento as any).frete)
    const impostos = parseNum((orcamento as any).impostos)
    const desconto = parseNum((orcamento as any).desconto)

    const totalItens = totaisItensFallback[orcamento.id] || 0
    if (totalItens > 0) {
      const impostosPercentual = parseNum((orcamento as any).impostos_percentual)
      const descontoPercentual = parseNum((orcamento as any).desconto_percentual)
      const impostosCalculados = impostos > 0 ? impostos : totalItens * (impostosPercentual / 100)
      const descontoCalculado = desconto > 0 ? desconto : totalItens * (descontoPercentual / 100)
      return totalItens + frete + impostosCalculados - descontoCalculado
    }

    const totalPorCampos = subtotal + frete + impostos - desconto
    return totalPorCampos > 0 ? totalPorCampos : totalDireto
  }, [totaisItensFallback])

  const buscarContadores = useCallback(async () => {
    const counts = await Promise.all([
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }),
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'rascunho'),
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'aprovado'),
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'rejeitado'),
      supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'expirado'),
    ])
    setContadores({
      todos: counts[0].count || 0,
      rascunho: counts[1].count || 0,
      enviado: counts[2].count || 0,
      aprovado: counts[3].count || 0,
      rejeitado: counts[4].count || 0,
      expirado: counts[5].count || 0,
    })
  }, [])

  const buscarOrcamentos = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('orcamentos').select('*', { count: 'exact' })

    if (statusAtivo !== 'todos') {
      query = query.eq('status', statusAtivo)
    }
    if (filtros.busca) {
      query = query.or(`numero.ilike.%${filtros.busca}%`)
    }
    if (filtros.gestao) {
      query = query.eq('gestao', filtros.gestao)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!error) {
      let rows = (data || []) as any[]

      // Enrich: resolve cliente_nome from clientes table if missing
      const clienteIds = [...new Set(rows.filter(r => r.cliente_id).map(r => r.cliente_id))]
      let clienteMap: Record<string, { nome_fantasia: string; cnpj: string }> = {}
      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase
          .from('clientes')
          .select('id, nome_fantasia, cnpj')
          .in('id', clienteIds)
        if (clientes) {
          clienteMap = Object.fromEntries(clientes.map((c: any) => [c.id, { nome_fantasia: c.nome_fantasia, cnpj: c.cnpj }]))
        }
      }

      // Enrich: resolve operacao/fornecedor from crm_cards by cliente_id
      let cardMap: Record<string, { operacao: string; gestao: string }> = {}
      const idsParaCards = [...new Set(rows.filter(r => !r.operacao && !r.fornecedor_nome).map(r => r.cliente_id).filter(Boolean))]
      if (idsParaCards.length > 0) {
        const { data: cards } = await supabase
          .from('crm_cards')
          .select('id, cliente_id, operacao, gestao')
          .in('cliente_id', idsParaCards)
          .order('created_at', { ascending: false })
        if (cards) {
          for (const c of cards as any[]) {
            // Use the most recent card per cliente
            if (!cardMap[c.cliente_id]) {
              cardMap[c.cliente_id] = { operacao: c.operacao, gestao: c.gestao }
            }
          }
        }
      }

      // Map rows, filling in missing fields from joined data
      const enrichedRows = rows.map((r: any) => {
        const cliente = clienteMap[r.cliente_id]
        const card = cardMap[r.cliente_id]
        return {
          ...r,
          cliente_nome: r.cliente_nome || cliente?.nome_fantasia || '',
          cliente_cnpj: r.cliente_cnpj || cliente?.cnpj || '',
          fornecedor_nome: r.fornecedor_nome || card?.operacao || '',
          operacao: r.operacao || card?.operacao || null,
          gestao: r.gestao || card?.gestao || null,
          total: parseNum(r.total) || parseNum(r.valor_total) || 0,
          subtotal: parseNum(r.subtotal) || parseNum(r.valor_produtos) || 0,
          frete: parseNum(r.frete) || parseNum(r.valor_frete) || 0,
          desconto: parseNum(r.desconto) || parseNum(r.valor_desconto) || 0,
        } as Orcamento
      })

      setOrcamentos(enrichedRows)
      setTotal(count || 0)

      const idsSemTotal = enrichedRows
        .filter((o) => parseNum((o as any).total) <= 0)
        .map((o) => o.id)

      if (idsSemTotal.length > 0) {
        const { data: itensData } = await supabase
          .from('orcamento_itens')
          .select('orcamento_id,total')
          .in('orcamento_id', idsSemTotal)

        const totaisMap = ((itensData as Array<{ orcamento_id: string; total: any }> | null) || [])
          .reduce<Record<string, number>>((acc, item) => {
            acc[item.orcamento_id] = (acc[item.orcamento_id] || 0) + parseNum(item.total)
            return acc
          }, {})

        setTotaisItensFallback(totaisMap)
      } else {
        setTotaisItensFallback({})
      }
    }
    setLoading(false)
  }, [page, pageSize, filtros, statusAtivo])

  useEffect(() => { buscarContadores() }, [buscarContadores])
  useEffect(() => { buscarOrcamentos() }, [buscarOrcamentos])

  const handleBuscaChange = (valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busca: valor }))
      setPage(1)
    }, 500)
  }

  async function visualizarOrcamento(o: Orcamento) {
    console.log('👁️ VISUALIZAR ORÇAMENTO - dados da listagem:', {
      id: o.id,
      numero: o.numero,
      subtotal: o.subtotal,
      total: o.total,
      impostos: o.impostos,
      desconto: o.desconto,
      frete: o.frete,
      fornecedor_id: o.fornecedor_id,
    })

    // Recarrega o orçamento direto do banco para evitar dados "enriquecidos" incorretos da listagem
    const { data: orcamentoDb } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', o.id)
      .maybeSingle()

    const orcamentoBase = (orcamentoDb as any)
      ? ({
          ...o,
          ...(orcamentoDb as any),
          total: parseNum((orcamentoDb as any).total) || parseNum((orcamentoDb as any).valor_total) || parseNum((o as any).total) || 0,
          subtotal: parseNum((orcamentoDb as any).subtotal) || parseNum((orcamentoDb as any).valor_produtos) || parseNum((o as any).subtotal) || 0,
          frete: parseNum((orcamentoDb as any).frete) || parseNum((orcamentoDb as any).valor_frete) || parseNum((o as any).frete) || 0,
          desconto: parseNum((orcamentoDb as any).desconto) || parseNum((orcamentoDb as any).valor_desconto) || parseNum((o as any).desconto) || 0,
        } as Orcamento)
      : o

    setOrcamentoVisualizar(orcamentoBase)

    const { data: itens } = await supabase
      .from('orcamento_itens')
      .select('*')
      .eq('orcamento_id', o.id)
      .order('ordem')
    console.log('📦 ITENS DO ORÇAMENTO:', itens?.map(i => ({ desc: (i as any).descricao, qty: (i as any).quantidade, price: (i as any).preco_unitario, total: (i as any).total })))
    setItensVisualizar((itens as OrcamentoItem[]) || [])
    setModalVisualizar(true)
  }
  function editarOrcamento(o: Orcamento) {
    setOrcamentoEditarId(o.id)
    setModalEditar(true)
  }
  function enviarOrcamento(_o: Orcamento) { toast.info('Envio em desenvolvimento') }
  function baixarPDF(_o: Orcamento) { toast.info('Download em desenvolvimento') }

  // Estilo de impressão
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #orcamento-conteudo, #orcamento-conteudo * { visibility: visible; }
        #orcamento-conteudo { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  async function deletarOrcamento(id: string) {
    if (!confirm('Deletar este orçamento?')) return
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (!error) {
      toast.success('Orçamento deletado!')
      buscarOrcamentos()
      buscarContadores()
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#1a4168]" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a4168]">Orçamentos</h1>
            <Badge variant="secondary">
              {statusAtivo === 'todos'
                ? `${total} orçamentos`
                : `${total} orçamento(s) ${getStatusLabel(statusAtivo)}`
              }
            </Badge>
          </div>
        </div>
      </div>

      {/* ABAS POR STATUS */}
      <Tabs value={statusAtivo} onValueChange={(v) => { setStatusAtivo(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="todos">
            Todos <Badge variant="secondary" className="ml-2">{contadores.todos}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rascunho">
            Rascunho <Badge variant="secondary" className="ml-2">{contadores.rascunho}</Badge>
          </TabsTrigger>
          <TabsTrigger value="enviado">
            Enviado <Badge variant="secondary" className="ml-2">{contadores.enviado}</Badge>
          </TabsTrigger>
          <TabsTrigger value="aprovado">
            Aprovado <Badge variant="secondary" className="ml-2">{contadores.aprovado}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejeitado">
            Rejeitado <Badge variant="secondary" className="ml-2">{contadores.rejeitado}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expirado">
            Expirado <Badge variant="secondary" className="ml-2">{contadores.expirado}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou fornecedor..."
            className="pl-10 bg-[#fcfcfc] border-[#e8e8e8]"
            onChange={(e) => handleBuscaChange(e.target.value)}
          />
        </div>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={filtros.gestao}
          onChange={(e) => { setFiltros(prev => ({ ...prev, gestao: e.target.value })); setPage(1) }}
        >
          <option value="">Todas as Gestões</option>
          <option value="G1">Gestão 1</option>
          <option value="G2">Gestão 2</option>
          <option value="G3">Gestão 3</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setFiltros({ busca: '', gestao: '' }); setStatusAtivo('todos'); setPage(1) }}
        >
          <Filter className="h-4 w-4 mr-1" />
          Limpar Filtros
        </Button>
      </div>

      {/* TABELA */}
      <div className="rounded-md border border-[#e8e8e8] bg-[#fcfcfc]">
        <Table>
          <TableHeader className="bg-[#1a4168]">
            <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
              <TableHead className="text-white">Número</TableHead>
              <TableHead className="text-white">Cliente</TableHead>
              <TableHead className="text-white">Fornecedor/Operação</TableHead>
              <TableHead className="text-white">Valor Total</TableHead>
              <TableHead className="text-white">Validade</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Data</TableHead>
              <TableHead className="text-white">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : orcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">Nenhum orçamento encontrado</p>
                    <p className="text-sm text-muted-foreground/70">
                      Orçamentos criados a partir de Ações Comerciais aparecerão aqui
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orcamentos.map((orcamento) => (
                <TableRow key={orcamento.id}>
                  <TableCell><span className="font-mono font-medium">{orcamento.numero}</span></TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{orcamento.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">{orcamento.cliente_cnpj}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{orcamento.fornecedor_nome || '-'}</p>
                      {orcamento.operacao && (
                        <Badge variant="outline" className="text-xs mt-0.5">{orcamento.operacao}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-medium">{formatCurrency(getTotalExibicao(orcamento))}</span></TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {orcamento.data_validade ? formatDate(orcamento.data_validade) : `${orcamento.validade_dias} dias`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(orcamento.status)}>{getStatusLabel(orcamento.status)}</Badge>
                  </TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{formatDate(orcamento.created_at)}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => visualizarOrcamento(orcamento)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editarOrcamento(orcamento)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => enviarOrcamento(orcamento)} disabled={orcamento.status !== 'rascunho'}><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => baixarPDF(orcamento)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletarOrcamento(orcamento.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINAÇÃO */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
      {/* MODAL VISUALIZAR */}
      <Dialog open={modalVisualizar} onOpenChange={setModalVisualizar}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização do orçamento {orcamentoVisualizar?.numero}</DialogTitle>
            <DialogDescription>
              Pré-visualização completa do orçamento com itens, totais e termos comerciais.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 border-b p-4 flex items-center justify-between">
            <h3 className="font-bold text-lg">
              Orçamento {orcamentoVisualizar?.numero}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir/PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setModalVisualizar(false)}>
                <X className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[85vh]" id="orcamento-conteudo">
            {orcamentoVisualizar && (
              <OrcamentoTemplate
                orcamento={orcamentoVisualizar}
                itens={itensVisualizar}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR */}
      <EditarOrcamentoModal
        open={modalEditar}
        onOpenChange={setModalEditar}
        orcamentoId={orcamentoEditarId}
        onSaved={() => {
          buscarOrcamentos()
          buscarContadores()
        }}
      />
    </div>
  )
}
