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
  ChevronRight,
  Badge as BadgeIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

// ─── Estágios ─────────────────────────────────────────────────────────────────
const estagios = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  { id: 'contato', label: 'Contato', color: 'bg-sky-100 text-sky-800' },
  { id: 'proposta', label: 'Proposta', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-orange-100 text-orange-800' },
  { id: 'fechado', label: 'Fechado', color: 'bg-green-100 text-green-800' },
  { id: 'consolidacao', label: 'Consolidação', color: 'bg-teal-100 text-teal-800' },
  { id: 'pos_venda', label: 'Pós-Venda', color: 'bg-purple-100 text-purple-800' },
  { id: 'realizado', label: 'Realizado', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-100 text-red-800' },
]

// ─── FunilVertical ────────────────────────────────────────────────────────────
interface FunilProps {
  cards: CRMCard[]
  cardSelecionado: CRMCard | null
  onSelecionar: (c: CRMCard) => void
}

function FunilVertical({ cards, cardSelecionado, onSelecionar }: FunilProps) {
  const [estagioAberto, setEstagioAberto] = useState<string | null>(null)

  return (
    <div className="p-3 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
        Funil de Oportunidades
      </p>
      {estagios.map((est) => {
        const grupo = cards.filter((c) => c.estagio === est.id)
        const aberto = estagioAberto === est.id

        return (
          <div key={est.id}>
            <button
              onClick={() => setEstagioAberto(aberto ? null : est.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
            >
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', est.color)}>
                {est.label}
              </span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{grupo.length}</span>
              <ChevronRight
                className={cn('w-3 h-3 text-muted-foreground transition-transform', aberto && 'rotate-90')}
              />
            </button>

            {aberto && grupo.length > 0 && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {grupo.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => onSelecionar(card)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors',
                      cardSelecionado?.id === card.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-accent/40 text-foreground'
                    )}
                  >
                    <p className="font-medium truncate">{card.cliente_nome}</p>
                    <p className="text-muted-foreground truncate">{card.operacao}</p>
                  </button>
                ))}
              </div>
            )}

            {aberto && grupo.length === 0 && (
              <p className="ml-3 mt-0.5 text-xs text-muted-foreground px-2 py-1">
                Nenhum card neste estágio
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── AreaTrabalho ─────────────────────────────────────────────────────────────
interface AreaProps {
  card: CRMCard
  documentos: DocumentoComercial[]
  onAcao: (acao: string, cardId: string) => void
}

const tipoIcone: Record<string, React.ReactNode> = {
  cotacao: <FileText className="w-4 h-4" />,
  orcamento: <DollarSign className="w-4 h-4" />,
  contrato: <FileSignature className="w-4 h-4" />,
  cobranca: <CreditCard className="w-4 h-4" />,
}

const statusBadge: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

function AreaTrabalho({ card, documentos, onAcao }: AreaProps) {
  const estagioInfo = estagios.find((e) => e.id === card.estagio)
  const docsFiltrados = documentos.filter((d) => d.card_id === card.id)

  return (
    <div className="space-y-6">
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{card.cliente_nome}</h2>
          <p className="text-sm text-muted-foreground">{card.operacao} · {card.cliente_cidade}/{card.cliente_estado}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{card.cliente_cnpj}</p>
        </div>
        <span className={cn('text-xs font-semibold px-2 py-1 rounded', estagioInfo?.color)}>
          {estagioInfo?.label}
        </span>
      </div>

      {/* Ações rápidas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Ações Comerciais
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onAcao('cotacao', card.id)}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Nova Cotação
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAcao('orcamento', card.id)}>
            <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Novo Orçamento
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAcao('contrato', card.id)}>
            <FileSignature className="w-3.5 h-3.5 mr-1.5" /> Novo Contrato
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAcao('cobranca', card.id)}>
            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Nova Cobrança
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAcao('enviar', card.id)}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar Documento
          </Button>
        </div>
      </div>

      {/* Documentos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Documentos ({docsFiltrados.length})
        </p>

        {docsFiltrados.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum documento criado</p>
            <p className="text-xs mt-1">Use os botões acima para criar o primeiro documento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docsFiltrados.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-3 flex items-center gap-3 hover:bg-accent/30 transition-colors"
              >
                <span className="text-muted-foreground">{tipoIcone[doc.tipo] ?? <FileText className="w-4 h-4" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.numero && `#${doc.numero} · `}
                    {doc.tipo.charAt(0).toUpperCase() + doc.tipo.slice(1)}
                    {doc.valor_total != null && ` · R$ ${doc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', statusBadge[doc.status])}>
                  {statusLabel[doc.status]}
                </span>
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
    buscarDados()
  }, [])

  async function buscarDados() {
    setLoading(true)
    try {
      const [{ data: cardsData }, { data: docsData }] = await Promise.all([
        supabase.from('crm_cards').select('*').order('ordem'),
        supabase.from('documentos_comerciais').select('*').order('created_at', { ascending: false }),
      ])

      const todosCards = cardsData ?? []
      const todosDocs = docsData ?? []

      setCards(todosCards)
      setDocumentos(todosDocs)

      // Métricas
      const realizados = todosCards.filter((c) => c.estagio === 'realizado').length
      const total = todosCards.length
      const taxaConversao = total > 0 ? Math.round((realizados / total) * 100) : 0

      setMetricas({
        cotacoesPendentes: todosDocs.filter((d) => d.tipo === 'cotacao' && d.status === 'rascunho').length,
        orcamentosEnviados: todosDocs.filter((d) => d.tipo === 'orcamento' && d.status === 'enviado').length,
        contratosAnalise: todosDocs.filter((d) => d.tipo === 'contrato' && d.status === 'enviado').length,
        valorTotal: todosDocs.reduce((acc, d) => acc + (d.valor_total ?? 0), 0),
        taxaConversao,
        tempoMedio: 0,
      })
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function executarAcao(acao: string, cardId: string) {
    console.log('Ação:', acao, 'Card:', cardId)
    // Futura implementação: abrir modal de criação de documento
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
