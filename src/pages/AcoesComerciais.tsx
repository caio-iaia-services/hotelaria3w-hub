import { supabase } from '@/lib/supabase'
import { CRMCard, DocumentoComercial } from '@/lib/types'
import { useState, useEffect } from 'react'
import {
  FileText,
  DollarSign,
  FileSignature,
  Send,
  CreditCard,
  FolderOpen,
  Plus,
  TrendingUp,
  Clock,
  MapPin,
  Zap,
  Eye,
  Download,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: React.ReactNode
  titulo: string
  valor: string | number
  cor: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'gray'
}

const corMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  gray: 'bg-muted text-muted-foreground border-border',
}

function MetricCard({ icon, titulo, valor, cor }: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border p-3 flex flex-col gap-1', corMap[cor])}>
      <div className="flex items-center gap-2 opacity-80">
        <span className="w-4 h-4 shrink-0">{icon}</span>
        <span className="text-[11px] font-medium leading-tight">{titulo}</span>
      </div>
      <span className="text-xl font-bold tracking-tight">{valor}</span>
    </div>
  )
}

// ─── FunilVertical ────────────────────────────────────────────────────────────
interface FunilProps {
  cards: CRMCard[]
  cardSelecionado: CRMCard | null
  onSelecionar: (c: CRMCard) => void
}

const estagioColorMap: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800',
  contato: 'bg-sky-100 text-sky-800',
  proposta: 'bg-yellow-100 text-yellow-800',
  negociacao: 'bg-orange-100 text-orange-800',
  fechado: 'bg-green-100 text-green-800',
  consolidacao: 'bg-teal-100 text-teal-800',
  pos_venda: 'bg-purple-100 text-purple-800',
  realizado: 'bg-emerald-100 text-emerald-800',
  perdido: 'bg-red-100 text-red-800',
}

const estagioLabelMap: Record<string, string> = {
  lead: 'Lead',
  contato: 'Contato',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  consolidacao: 'Consolidação',
  pos_venda: 'Pós-Venda',
  realizado: 'Realizado',
  perdido: 'Perdido',
}

function getEstagioColor(estagio: string) {
  return estagioColorMap[estagio] ?? 'bg-gray-100 text-gray-700'
}

function FunilVertical({ cards, cardSelecionado, onSelecionar }: FunilProps) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Leads Ativos ({cards.length})
        </h3>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum lead ativo
        </div>
      ) : (
        cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelecionar(card)}
            className={cn(
              'w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-md',
              cardSelecionado?.id === card.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/40'
            )}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{card.cliente_nome}</p>
                <p className="text-xs text-muted-foreground truncate">{card.operacao}</p>
              </div>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0', getEstagioColor(card.estagio))}>
                {estagioLabelMap[card.estagio] ?? card.estagio}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              {card.cliente_cidade}/{card.cliente_estado}
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ─── AreaTrabalho ─────────────────────────────────────────────────────────────
interface AreaProps {
  card: CRMCard
  documentos: DocumentoComercial[]
  onAcao: (acao: string, cardId: string) => void
}

// Helpers de documentos
function hasOrcamento(docs: DocumentoComercial[]) {
  return docs.some((d) => d.tipo === 'orcamento')
}
function hasContrato(docs: DocumentoComercial[]) {
  return docs.some((d) => d.tipo === 'contrato')
}
function hasContratoAprovado(docs: DocumentoComercial[]) {
  return docs.some((d) => d.tipo === 'contrato' && d.status === 'aprovado')
}

function getDocumentoIcon(tipo: string) {
  const map: Record<string, React.ReactNode> = {
    cotacao: <FileText className="w-4 h-4 text-primary" />,
    orcamento: <DollarSign className="w-4 h-4 text-primary" />,
    contrato: <FileSignature className="w-4 h-4 text-primary" />,
    cobranca: <CreditCard className="w-4 h-4 text-primary" />,
  }
  return map[tipo] ?? <FileText className="w-4 h-4 text-muted-foreground" />
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const statusBadge: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviado: 'bg-secondary text-secondary-foreground',
  aprovado: 'bg-primary/10 text-primary',
  rejeitado: 'bg-destructive/10 text-destructive',
}

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

function AreaTrabalho({ card, documentos, onAcao }: AreaProps) {
  const docsFiltrados = documentos.filter((d) => d.card_id === card.id)

  return (
    <div className="space-y-6">
      {/* INFO DO CLIENTE */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{card.cliente_nome}</h2>
            <p className="text-sm text-muted-foreground">CNPJ: {card.cliente_cnpj}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge>{card.operacao}</Badge>
              <Badge variant="outline">{card.cliente_cidade}/{card.cliente_estado}</Badge>
            </div>
          </div>
          <span className={cn('text-xs font-semibold px-2 py-1 rounded shrink-0', getEstagioColor(card.estagio))}>
            {estagioLabelMap[card.estagio] ?? card.estagio}
          </span>
        </div>

        {card.observacoes && (
          <div className="mt-4 p-3 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground">{card.observacoes}</p>
          </div>
        )}
      </div>

      {/* AÇÕES DISPONÍVEIS */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Ações Disponíveis
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('solicitar_cotacao', card.id)}
          >
            <FileText className="w-6 h-6" />
            <span className="text-sm">Solicitar Cotação</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('preparar_orcamento', card.id)}
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-sm">Preparar Orçamento</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('gerar_contrato', card.id)}
          >
            <FileSignature className="w-6 h-6" />
            <span className="text-sm">Gerar Contrato</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('enviar_orcamento', card.id)}
            disabled={!hasOrcamento(docsFiltrados)}
          >
            <Send className="w-6 h-6" />
            <span className="text-sm">Enviar Orçamento</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('enviar_contrato', card.id)}
            disabled={!hasContrato(docsFiltrados)}
          >
            <Send className="w-6 h-6" />
            <span className="text-sm">Enviar Contrato</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('gerar_cobranca', card.id)}
            disabled={!hasContratoAprovado(docsFiltrados)}
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-sm">Gerar Cobrança</span>
          </Button>
        </div>
      </div>

      {/* DOCUMENTOS GERADOS */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            Documentos Gerados ({docsFiltrados.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => window.open(`https://drive.google.com/drive/search?q=${card.cliente_nome}`, '_blank')}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Ver todos no Drive
          </Button>
        </div>

        {docsFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum documento gerado ainda</p>
            <p className="text-xs mt-1">Use as ações acima para criar o primeiro documento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docsFiltrados.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getDocumentoIcon(doc.tipo)}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)} · {doc.tipo.charAt(0).toUpperCase() + doc.tipo.slice(1)}
                      {doc.valor_total != null && ` · R$ ${doc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', statusBadge[doc.status])}>
                    {statusLabel[doc.status]}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AcoesComerciais() {
  const [cards, setCards] = useState<CRMCard[]>([])
  const [cardSelecionado, setCardSelecionado] = useState<CRMCard | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoComercial[]>([])
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({
    cotacoesPendentes: 0,
    orcamentosEnviados: 0,
    contratosAnalise: 0,
    valorTotal: 0,
    taxaConversao: 0,
    tempoMedio: 0,
  })

  useEffect(() => {
    buscarLeadsAtivos()
    buscarMetricas()
  }, [])

  useEffect(() => {
    if (cardSelecionado) {
      buscarDocumentos(cardSelecionado.id)
    }
  }, [cardSelecionado])

  async function buscarLeadsAtivos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('crm_cards')
      .select('*')
      .in('estagio', ['lead', 'contato', 'proposta', 'negociacao', 'fechado'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCards(data)
      if (data.length > 0 && !cardSelecionado) {
        setCardSelecionado(data[0])
      }
    }

    setLoading(false)
  }

  async function buscarDocumentos(cardId: string) {
    const { data, error } = await supabase
      .from('documentos_comerciais')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDocumentos(data)
    }
  }

  async function buscarMetricas() {
    const [
      { count: cotacoes },
      { count: orcamentos },
      { count: contratos },
      { data: valores },
      { count: aprovados },
    ] = await Promise.all([
      supabase.from('documentos_comerciais').select('*', { count: 'exact', head: true }).eq('tipo', 'cotacao').eq('status', 'enviado'),
      supabase.from('documentos_comerciais').select('*', { count: 'exact', head: true }).eq('tipo', 'orcamento').eq('status', 'enviado'),
      supabase.from('documentos_comerciais').select('*', { count: 'exact', head: true }).eq('tipo', 'contrato').eq('status', 'enviado'),
      supabase.from('documentos_comerciais').select('valor_total').eq('tipo', 'orcamento').in('status', ['enviado', 'aprovado']),
      supabase.from('documentos_comerciais').select('*', { count: 'exact', head: true }).eq('tipo', 'orcamento').eq('status', 'aprovado'),
    ])

    const valorTotal = valores?.reduce((sum, doc) => sum + (doc.valor_total || 0), 0) || 0
    const taxaConversao = (orcamentos ?? 0) > 0 ? Math.round(((aprovados ?? 0) / (orcamentos ?? 1)) * 100) : 0

    setMetricas({
      cotacoesPendentes: cotacoes ?? 0,
      orcamentosEnviados: orcamentos ?? 0,
      contratosAnalise: contratos ?? 0,
      valorTotal,
      taxaConversao,
      tempoMedio: 5,
    })
  }

  async function executarAcao(acao: string, cardId: string) {
    if (!cardSelecionado) return

    switch (acao) {
      case 'solicitar_cotacao': await solicitarCotacao(); break
      case 'preparar_orcamento': await prepararOrcamento(); break
      case 'gerar_contrato': await gerarContrato(); break
      case 'enviar_orcamento': await enviarOrcamento(); break
      case 'enviar_contrato': await enviarContrato(); break
      case 'gerar_cobranca': await gerarCobranca(); break
    }
  }

  async function solicitarCotacao() {
    try {
      const numero = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      const { data, error } = await supabase
        .from('documentos_comerciais')
        .insert({
          card_id: cardSelecionado!.id,
          cliente_id: cardSelecionado!.cliente_id,
          tipo: 'cotacao',
          numero,
          titulo: `Cotação ${cardSelecionado!.operacao} - ${cardSelecionado!.cliente_nome}`,
          status: 'rascunho',
          conteudo: {
            operacao: cardSelecionado!.operacao,
            observacoes: cardSelecionado!.observacoes,
          },
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado!.id,
        documento_id: data.id,
        acao: 'cotacao_solicitada',
        descricao: `Cotação ${numero} solicitada`,
      })

      toast.success('Cotação criada com sucesso!')
      buscarDocumentos(cardSelecionado!.id)
      buscarMetricas()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar cotação')
    }
  }

  async function prepararOrcamento() {
    try {
      const { data: cotacao } = await supabase
        .from('documentos_comerciais')
        .select('*')
        .eq('card_id', cardSelecionado!.id)
        .eq('tipo', 'cotacao')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const numero = `ORC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      const { data, error } = await supabase
        .from('documentos_comerciais')
        .insert({
          card_id: cardSelecionado!.id,
          cliente_id: cardSelecionado!.cliente_id,
          tipo: 'orcamento',
          numero,
          titulo: `Orçamento ${cardSelecionado!.operacao} - ${cardSelecionado!.cliente_nome}`,
          status: 'rascunho',
          conteudo: {
            operacao: cardSelecionado!.operacao,
            baseado_cotacao: cotacao?.numero ?? null,
            itens: [],
          },
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado!.id,
        documento_id: data.id,
        acao: 'orcamento_preparado',
        descricao: `Orçamento ${numero} preparado`,
      })

      toast.success('Orçamento criado! Preencha os detalhes.')
      buscarDocumentos(cardSelecionado!.id)
      buscarMetricas()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar orçamento')
    }
  }

  async function gerarContrato() {
    try {
      const { data: orcamento } = await supabase
        .from('documentos_comerciais')
        .select('*')
        .eq('card_id', cardSelecionado!.id)
        .eq('tipo', 'orcamento')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!orcamento) {
        toast.error('É necessário ter um orçamento aprovado')
        return
      }

      const numero = `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      const { data, error } = await supabase
        .from('documentos_comerciais')
        .insert({
          card_id: cardSelecionado!.id,
          cliente_id: cardSelecionado!.cliente_id,
          tipo: 'contrato',
          numero,
          titulo: `Contrato ${cardSelecionado!.operacao} - ${cardSelecionado!.cliente_nome}`,
          status: 'rascunho',
          valor_total: orcamento.valor_total,
          conteudo: {
            baseado_orcamento: orcamento.numero,
            valor_total: orcamento.valor_total,
          },
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado!.id,
        documento_id: data.id,
        acao: 'contrato_gerado',
        descricao: `Contrato ${numero} gerado`,
      })

      toast.success('Contrato gerado com sucesso!')
      buscarDocumentos(cardSelecionado!.id)
      buscarMetricas()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar contrato')
    }
  }

  async function enviarOrcamento() {
    toast.info('Funcionalidade de envio em desenvolvimento')
  }

  async function enviarContrato() {
    toast.info('Funcionalidade de envio em desenvolvimento')
  }

  async function gerarCobranca() {
    toast.info('Funcionalidade de cobrança em desenvolvimento')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b bg-background">
        <h1 className="text-2xl font-bold">Ações Comerciais</h1>
        <p className="text-sm text-muted-foreground">Gerencie cotações, orçamentos e contratos</p>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b bg-muted/30">
        <MetricCard icon={<FileText className="w-4 h-4" />} titulo="Cotações Pendentes" valor={metricas.cotacoesPendentes} cor="blue" />
        <MetricCard icon={<DollarSign className="w-4 h-4" />} titulo="Orçamentos Enviados" valor={metricas.orcamentosEnviados} cor="green" />
        <MetricCard icon={<FileSignature className="w-4 h-4" />} titulo="Contratos em Análise" valor={metricas.contratosAnalise} cor="orange" />
        <MetricCard
          icon={<DollarSign className="w-4 h-4" />}
          titulo="Valor Total"
          valor={`R$ ${(metricas.valorTotal / 1000).toFixed(0)}k`}
          cor="purple"
        />
        <MetricCard icon={<TrendingUp className="w-4 h-4" />} titulo="Taxa Conversão" valor={`${metricas.taxaConversao}%`} cor="teal" />
        <MetricCard icon={<Clock className="w-4 h-4" />} titulo="Tempo Médio" valor={`${metricas.tempoMedio} dias`} cor="gray" />
      </div>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        {/* FUNIL VERTICAL (ESQUERDA) */}
        <div className="w-80 border-r bg-muted/20 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : (
            <FunilVertical
              cards={cards}
              cardSelecionado={cardSelecionado}
              onSelecionar={setCardSelecionado}
            />
          )}
        </div>

        {/* ÁREA DE TRABALHO (DIREITA) */}
        <div className="flex-1 p-6 overflow-y-auto">
          {cardSelecionado ? (
            <AreaTrabalho
              card={cardSelecionado}
              documentos={documentos}
              onAcao={executarAcao}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium">Selecione um lead no funil para começar</p>
                <p className="text-sm mt-1">Clique em um estágio e depois em um cliente</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
