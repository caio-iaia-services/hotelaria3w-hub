import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ShoppingCart, Search, Edit, Send, FileDown, FileSpreadsheet, Trash2, ChevronDown, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EnviarPedidoDialog } from '@/components/pedidos/EnviarPedidoDialog'
import { PedidoCastorModal } from '@/components/pedidos/PedidoCastorModal'
import { STATUS_PEDIDO, atualizarStatusPedido, carregarPedido, dadosDoPedidoRow, excluirPedido, MSG_MIGRACAO } from '@/lib/pedidoCastorDb'
import { baixarPedidoPDF, baixarPedidoXlsx, MAX_ITENS_PLANILHA } from '@/lib/pedidoCastorExport'
import { moeda, dataBR, num } from '@/lib/pedidoCastor'

const db: any = supabase // tabela nova, ainda fora de integrations/supabase/types.ts

interface Linha {
  id: string
  orcamento_id: string
  numero: string
  razao_social: string | null
  cnpj: string | null
  data_pedido: string | null
  tabela: string | null
  condicoes_pagamento: string | null
  total: number | string | null
  status: string
}

const statusInfo = (s: string) => STATUS_PEDIDO.find(x => x.value === s) ?? STATUS_PEDIDO[0]

export default function Pedidos() {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [enviarId, setEnviarId] = useState<string | null>(null)
  const [trabalhando, setTrabalhando] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    let q = db
      .from('pedidos_castor')
      .select('id, orcamento_id, numero, razao_social, cnpj, data_pedido, tabela, condicoes_pagamento, total, status')
      .order('created_at', { ascending: false })
      .limit(300)
    const t = busca.trim().replace(/[,()%]/g, ' ')
    if (t) q = q.or(`numero.ilike.%${t}%,razao_social.ilike.%${t}%,cnpj.ilike.%${t}%`)
    const { data, error } = await q
    if (error) {
      const ausente = error.code === '42P01' || error.code === 'PGRST205'
      toast.error(ausente ? MSG_MIGRACAO : 'Erro ao carregar pedidos', { description: ausente ? undefined : error.message, duration: 10000 })
      setLinhas([])
    } else {
      setLinhas((data as Linha[]) || [])
    }
    setCarregando(false)
  }, [busca])

  useEffect(() => {
    const h = setTimeout(buscar, 250)
    return () => clearTimeout(h)
  }, [buscar])

  async function exportar(l: Linha, tipo: 'pdf' | 'xlsx') {
    setTrabalhando(`${l.id}:${tipo}`)
    try {
      const { pedido, itens } = await carregarPedido(l.id)
      const dados = dadosDoPedidoRow(pedido)
      if (tipo === 'pdf') await baixarPedidoPDF(dados, itens)
      else await baixarPedidoXlsx(dados, itens)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar o arquivo')
    } finally {
      setTrabalhando(null)
    }
  }

  async function mudarStatus(l: Linha, status: string) {
    if (l.status === status) return
    const anterior = l.status
    setLinhas(p => p.map(x => (x.id === l.id ? { ...x, status } : x)))
    try {
      await atualizarStatusPedido(l.id, status)
      toast.success(`Pedido ${l.numero} → ${statusInfo(status).label}`)
    } catch (e: any) {
      setLinhas(p => p.map(x => (x.id === l.id ? { ...x, status: anterior } : x)))
      toast.error('Erro ao atualizar status', { description: e?.message })
    }
  }

  async function excluir(l: Linha) {
    if (!confirm(`Excluir o pedido ${l.numero}? Esta ação não pode ser desfeita. O orçamento de origem não é alterado.`)) return
    try {
      await excluirPedido(l.id)
      toast.success('Pedido excluído')
      buscar()
    } catch (e: any) {
      toast.error('Erro ao excluir', { description: e?.message })
    }
  }

  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-[#1a4168]" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a4168]">Pedidos</h1>
            <Badge variant="secondary">{linhas.length} pedido(s) Castor</Badge>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-white" placeholder="Buscar por número, cliente ou CNPJ" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border border-[#e8e8e8] bg-[#fcfcfc]">
        <Table>
          <TableHeader className="bg-[#1a4168]">
            <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
              <TableHead className="text-white">Pedido</TableHead>
              <TableHead className="text-white">Cliente</TableHead>
              <TableHead className="text-white">Data</TableHead>
              <TableHead className="text-white">Tabela</TableHead>
              <TableHead className="text-white">Pagamento</TableHead>
              <TableHead className="text-white">Valor Total</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">Nenhum pedido encontrado</p>
                    <p className="text-sm text-muted-foreground/70">Aprove um orçamento Castor e use “Fazer Pedido” em Ações Comerciais ou em Orçamentos</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              linhas.map(l => (
                <TableRow key={l.id}>
                  <TableCell><span className="font-mono font-medium">{l.numero}</span></TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{l.razao_social}</p>
                    <p className="text-xs text-muted-foreground">{l.cnpj}</p>
                  </TableCell>
                  <TableCell className="text-sm">{dataBR(l.data_pedido)}</TableCell>
                  <TableCell className="text-sm">{l.tabela}</TableCell>
                  <TableCell className="text-sm">{l.condicoes_pagamento}</TableCell>
                  <TableCell><span className="font-medium">{moeda(num(l.total))}</span></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none" title="Alterar status">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${statusInfo(l.status).classe}`}>
                            {statusInfo(l.status).label}<ChevronDown className="w-3 h-3" />
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {STATUS_PEDIDO.map(o => (
                          <DropdownMenuItem key={o.value} onClick={() => mudarStatus(l, o.value)} className={l.status === o.value ? 'bg-muted font-medium' : ''}>
                            {o.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir / editar" onClick={() => setAberto(l.id)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8a6417]" title="Enviar (e-mail / WhatsApp)" onClick={() => setEnviarId(l.id)}><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar PDF" disabled={trabalhando === `${l.id}:pdf`} onClick={() => exportar(l, 'pdf')}>
                        {trabalhando === `${l.id}:pdf` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={`Planilha editável (até ${MAX_ITENS_PLANILHA} itens)`} disabled={trabalhando === `${l.id}:xlsx`} onClick={() => exportar(l, 'xlsx')}>
                        {trabalhando === `${l.id}:xlsx` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => excluir(l)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EnviarPedidoDialog open={!!enviarId} pedidoId={enviarId} onClose={() => setEnviarId(null)} onSent={buscar} />
      <PedidoCastorModal open={!!aberto} pedidoId={aberto} onClose={() => setAberto(null)} onSaved={buscar} />
    </div>
  )
}
