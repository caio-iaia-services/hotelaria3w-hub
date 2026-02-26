import { supabase } from '@/lib/supabase'
import { Orcamento } from '@/lib/types'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Plus, Eye, Send, Edit, Download,
  Trash2, Filter, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
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
  const [filtros, setFiltros] = useState({ busca: '', status: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarOrcamentos = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('orcamentos')
      .select('*', { count: 'exact' })

    if (filtros.busca) {
      query = query.or(
        `numero.ilike.%${filtros.busca}%,cliente_nome.ilike.%${filtros.busca}%,fornecedor_nome.ilike.%${filtros.busca}%`
      )
    }

    if (filtros.status) {
      query = query.eq('status', filtros.status)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!error) {
      setOrcamentos((data as Orcamento[]) || [])
      setTotal(count || 0)
    }

    setLoading(false)
  }, [page, pageSize, filtros])

  useEffect(() => {
    buscarOrcamentos()
  }, [buscarOrcamentos])

  const handleBuscaChange = (valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busca: valor }))
      setPage(1)
    }, 500)
  }

  function visualizarOrcamento(_orcamento: Orcamento) {
    toast.info('Visualização em desenvolvimento')
  }

  function editarOrcamento(_orcamento: Orcamento) {
    toast.info('Edição em desenvolvimento')
  }

  function enviarOrcamento(_orcamento: Orcamento) {
    toast.info('Envio em desenvolvimento')
  }

  function baixarPDF(_orcamento: Orcamento) {
    toast.info('Download em desenvolvimento')
  }

  async function deletarOrcamento(id: string) {
    if (!confirm('Deletar este orçamento?')) return

    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id)

    if (!error) {
      toast.success('Orçamento deletado!')
      buscarOrcamentos()
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Orçamentos</h1>
            <span className="text-sm text-muted-foreground">{total} orçamentos</span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou fornecedor..."
            className="pl-10"
            onChange={(e) => handleBuscaChange(e.target.value)}
          />
        </div>

        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={filtros.status}
          onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">Todos os Status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviado">Enviado</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="expirado">Expirado</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFiltros({ busca: '', status: '' })}
        >
          <Filter className="h-4 w-4 mr-1" />
          Limpar Filtros
        </Button>
      </div>

      {/* TABELA */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fornecedor/Operação</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
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
                  <TableCell>
                    <span className="font-mono font-medium">{orcamento.numero}</span>
                  </TableCell>
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
                  <TableCell>
                    <span className="font-medium">{formatCurrency(orcamento.total)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {orcamento.data_validade
                        ? formatDate(orcamento.data_validade)
                        : `${orcamento.validade_dias} dias`
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(orcamento.status)}>
                      {getStatusLabel(orcamento.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(orcamento.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => visualizarOrcamento(orcamento)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editarOrcamento(orcamento)} disabled={orcamento.status === 'aprovado'}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => enviarOrcamento(orcamento)} disabled={orcamento.status !== 'rascunho'}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => baixarPDF(orcamento)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletarOrcamento(orcamento.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
