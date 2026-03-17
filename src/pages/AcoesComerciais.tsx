import { supabase } from '@/lib/supabase'
import { supabase as supabaseCloud } from '@/integrations/supabase/client'
import { CRMCard, DocumentoComercial } from '@/lib/types'
import { useState, useEffect, useMemo } from 'react'
import { gestaoOperacoes as gestaoOperacoesBase } from '@/data/mockOportunidades'
import {
  FileText, DollarSign, FileSignature,
  Send, CreditCard, FolderOpen, Zap,
  TrendingUp, Clock, MapPin, Eye, Download, Plus, Trash2, Upload, X, Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { montarCondicoesPagamentoPayload } from '@/lib/condicoesPagamento'
import { resolverCondicoesPagamentoMidea, resolverImagemMarketing, resolverTermosFornecedor } from '@/lib/fornecedorTerms'
import { OrcamentoItemRow } from '@/components/orcamentos/OrcamentoItemRow'

// ─── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: React.ReactNode
  titulo: string
  valor: string | number
  cor: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'gray'
}

function MetricCard({ icon, titulo, valor, cor }: MetricCardProps) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
    gray: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', cores[cor])}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{valor}</p>
      <p className="text-sm text-muted-foreground">{titulo}</p>
    </div>
  )
}

// ─── Estágio helpers ──────────────────────────────────────────────────────────
const estagioLabelMap: Record<string, string> = {
  lead: 'Lead', contato: 'Contato', proposta: 'Proposta',
  negociacao: 'Negociação', fechado: 'Fechado', consolidacao: 'Consolidação',
  pos_venda: 'Pós-Venda', realizado: 'Realizado', perdido: 'Perdido',
}

// ─── FunilVertical ────────────────────────────────────────────────────────────
interface FunilProps {
  cards: CRMCard[]
  cardSelecionado: CRMCard | null
  onSelecionar: (c: CRMCard) => void
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
              <Badge
                variant={
                  card.estagio === 'lead' ? 'secondary' :
                    card.estagio === 'contato' ? 'default' :
                      card.estagio === 'proposta' ? 'outline' :
                        card.estagio === 'negociacao' ? 'destructive' :
                          'default'
                }
                className="shrink-0 text-[10px]"
              >
                {estagioLabelMap[card.estagio] ?? card.estagio}
              </Badge>
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

function AreaTrabalho({ card, documentos, onAcao }: AreaProps) {
  const hasOrcamento = (docs: DocumentoComercial[]) =>
    docs.some((d) => d.tipo === 'orcamento' && d.status !== 'rejeitado')

  const hasContrato = (docs: DocumentoComercial[]) =>
    docs.some((d) => d.tipo === 'contrato' && d.status !== 'rejeitado')

  const hasContratoAprovado = (docs: DocumentoComercial[]) =>
    docs.some((d) => d.tipo === 'contrato' && d.status === 'aprovado')

  const getDocumentoIcon = (tipo: string) => {
    const icones: Record<string, React.ReactNode> = {
      cotacao: <FileText className="w-5 h-5 text-primary" />,
      orcamento: <DollarSign className="w-5 h-5 text-primary" />,
      contrato: <FileSignature className="w-5 h-5 text-primary" />,
      cobranca: <CreditCard className="w-5 h-5 text-primary" />,
    }
    return icones[tipo] ?? <FileText className="w-5 h-5 text-muted-foreground" />
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const abrirGoogleDrive = () => {
    window.open('https://drive.google.com', '_blank')
    toast.info('Integração com Google Drive em desenvolvimento')
  }

  return (
    <div className="space-y-6">
      {/* INFO DO CLIENTE */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{card.cliente_nome}</h2>
            <p className="text-muted-foreground text-sm">CNPJ: {card.cliente_cnpj}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge>{card.operacao}</Badge>
              <Badge variant="outline">{card.cliente_cidade}/{card.cliente_estado}</Badge>
            </div>
          </div>
          <Badge variant="default" className="text-sm px-3 py-1 shrink-0">
            {estagioLabelMap[card.estagio] ?? card.estagio}
          </Badge>
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
          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('solicitar_cotacao', card.id)}>
            <FileText className="w-6 h-6" />
            <span className="text-sm">Solicitar Cotação</span>
          </Button>

          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('preparar_orcamento', card.id)}>
            <DollarSign className="w-6 h-6" />
            <span className="text-sm">Preparar Orçamento</span>
          </Button>

          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            onClick={() => onAcao('gerar_contrato', card.id)}>
            <FileSignature className="w-6 h-6" />
            <span className="text-sm">Gerar Contrato</span>
          </Button>

          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            disabled={!hasOrcamento(documentos)}
            onClick={() => onAcao('enviar_orcamento', card.id)}>
            <Send className="w-6 h-6" />
            <span className="text-sm">Enviar Orçamento</span>
          </Button>

          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            disabled={!hasContrato(documentos)}
            onClick={() => onAcao('enviar_contrato', card.id)}>
            <Send className="w-6 h-6" />
            <span className="text-sm">Enviar Contrato</span>
          </Button>

          <Button variant="outline" className="h-auto py-4 flex-col gap-2"
            disabled={!hasContratoAprovado(documentos)}
            onClick={() => onAcao('gerar_cobranca', card.id)}>
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
            Documentos Gerados ({documentos.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={abrirGoogleDrive}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Ver todos no Drive
          </Button>
        </div>

        {documentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum documento gerado ainda</p>
            <p className="text-xs mt-1">Use as ações acima para criar o primeiro documento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {getDocumentoIcon(doc.tipo)}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)} · {doc.status}
                      {doc.valor_total != null && ` · R$ ${doc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function normalizarNomeFornecedor(nome: string | null | undefined) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function isFornecedorMidea(fornecedor: Pick<FornecedorLocal, 'tipo_layout' | 'nome_fantasia'> | null | undefined) {
  if (!fornecedor) return false
  if (fornecedor.tipo_layout === 'midea') return true

  const nomeNormalizado = normalizarNomeFornecedor(fornecedor.nome_fantasia)
  return (
    nomeNormalizado.includes('MIDEA') ||
    nomeNormalizado.includes('SPRINGER') ||
    nomeNormalizado.includes('CLIMAZON') ||
    nomeNormalizado.includes('CARRIER')
  )
}

// ─── Item type ────────────────────────────────────────────────────────────────
interface ItemOrcamento {
  id: number
  codigo: string
  descricao: string
  medidas: string
  especificacoes: string
  quantidade: number
  preco_unitario: number
  total: number
}

// ─── Fornecedor type (local) ─────────────────────────────────────────────────
interface FornecedorLocal {
  id: string
  nome_fantasia: string
  codigo: string | null
  gestao: string | null
  termos_fabricante: string | null
  produtos_servicos: string | null
  prazo_entrega_padrao: string | null
  validade_dias_padrao: number | null
  condicoes_pagamento_padrao: string | null
  imagem_template_url: string | null
  tipo_layout: string | null
}

// ─── ImagemMarketing type ────────────────────────────────────────────────────
interface ImagemMarketingState {
  preview: string
  nome: string
  tamanho: number
  file: File | null
  ehPadrao: boolean
}

// ─── ClienteCompleto type ────────────────────────────────────────────────────
interface ClienteCompleto {
  nome_fantasia: string | null
  cnpj: string | null
  razao_social: string | null
  email: string | null
  telefone: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
}

// ─── TERMOS 3W ───────────────────────────────────────────────────────────────
const TERMOS_3W = `1. Esta proposta é válida por [VALIDADE] dias.
2. O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.
3. Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.
4. Alguns produtos/serviços podem sofrer pequena alteração de preço em função do ICMS do Estado onde será feito o Faturamento e Entrega.
5. Fabricantes/Fornecedores têm políticas de "frete" e "IPI" diferentes. Consulte antecipadamente o Vendedor e atente para as condições gerais da Fatura.
6. Embora o nosso sistema atribua automaticamente validade do Orçamento de 30 dias, os preços podem sofrer alterações por motivos de força maior, tais como variações abruptas de matéria-prima e/ou outro qualquer fator que exceda a competência direta da 3W HOTELARIA.`
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

  // Modal de orçamento
  const [modalOrcamento, setModalOrcamento] = useState(false)
  const [itensOrcamento, setItensOrcamento] = useState<ItemOrcamento[]>([])
  const [clienteCompleto, setClienteCompleto] = useState<ClienteCompleto | null>(null)
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorLocal | null>(null)
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<FornecedorLocal[]>([])
  const [fornecedoresDb, setFornecedoresDb] = useState<{ nome_fantasia: string; gestao: string }[]>([])
  const [operacaoSelecionada, setOperacaoSelecionada] = useState('')
  const [imagemMarketing, setImagemMarketing] = useState<ImagemMarketingState | null>(null)
  const [uploadingImagem, setUploadingImagem] = useState(false)
  const [imagensAdicionais, setImagensAdicionais] = useState<File[]>([])
  const [imagensAdicionaisPreview, setImagensAdicionaisPreview] = useState<string[]>([])
  const [dadosOrcamento, setDadosOrcamento] = useState({
    prazo_entrega: '45/60 dias',
    validade_dias: 30,
    frete: 0,
    frete_tipo: 'CIF (Incluso)',
    impostos: 0,
    desconto: 0,
    condicoes_pagamento: 'ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\n- para 30/60/90/120/150 acréscimo de 3,80%\n- para 30/60/90/120/150/180 acréscimo de 4,20%\n- para 30/60/90/120/150/180/210 acréscimo de 4,80%\n- para 30/60/90/120/150/180/210/240 acréscimo de 5,20%\n- para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%\n- para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.',
    observacoes: '',
    observacoes_gerais: '',
    difal_texto: 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.',
  })

  // Merge static operations with DB fornecedores
  const operacoesDisponiveis = useMemo(() => {
    const merged: Record<number, string[]> = {
      1: [...gestaoOperacoesBase[1]],
      2: [...gestaoOperacoesBase[2]],
      3: [...gestaoOperacoesBase[3]],
      4: [...(gestaoOperacoesBase[4] || [])],
    }
    for (const f of fornecedoresDb) {
      const gestoes = f.gestao.split(',').map(g => g.trim()).filter(Boolean)
      for (const g of gestoes) {
        const key = parseInt(g.replace(/\D/g, ''), 10)
        if (merged[key] && !merged[key].includes(f.nome_fantasia)) {
          merged[key].push(f.nome_fantasia)
        }
      }
    }
    return merged
  }, [fornecedoresDb])

  useEffect(() => {
    buscarLeadsAtivos()
    buscarMetricas()
    // Fetch fornecedores for operations list
    supabase.from('fornecedores').select('nome_fantasia, gestao')
      .not('gestao', 'is', null).neq('gestao', '')
      .then(({ data }) => setFornecedoresDb(data || []))
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

    if (error) {
      console.error('❌ Erro ao buscar leads:', error)
    }
    if (!error && data) {
      console.log('✅ Leads encontrados:', data.length)
      const cardsData = data as unknown as CRMCard[]
      setCards(cardsData)
      if (cardsData.length > 0 && !cardSelecionado) {
        setCardSelecionado(cardsData[0])
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

    if (!error && data) setDocumentos(data as unknown as DocumentoComercial[])
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

  async function executarAcao(acao: string, _cardId: string) {
    if (!cardSelecionado) return
    switch (acao) {
      case 'solicitar_cotacao': await solicitarCotacao(); break
      case 'preparar_orcamento': abrirModalOrcamento(); break
      case 'gerar_contrato': await gerarContrato(); break
      case 'enviar_orcamento': toast.info('Funcionalidade de envio em desenvolvimento'); break
      case 'enviar_contrato': toast.info('Funcionalidade de envio em desenvolvimento'); break
      case 'gerar_cobranca': toast.info('Funcionalidade de cobrança em desenvolvimento'); break
    }
  }

  async function solicitarCotacao() {
    try {
      const numero = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const { data, error } = await supabase.from('documentos_comerciais').insert({
        card_id: cardSelecionado!.id,
        cliente_id: cardSelecionado!.cliente_id,
        tipo: 'cotacao', numero,
        titulo: `Cotação ${cardSelecionado!.operacao} - ${cardSelecionado!.cliente_nome}`,
        status: 'rascunho',
        conteudo: { operacao: cardSelecionado!.operacao, observacoes: cardSelecionado!.observacoes },
      }).select().single()
      if (error) throw error
      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado!.id, documento_id: data.id,
        acao: 'cotacao_solicitada', descricao: `Cotação ${numero} solicitada`,
      })
      toast.success('Cotação criada com sucesso!')
      buscarDocumentos(cardSelecionado!.id)
      buscarMetricas()
    } catch (err) { console.error(err); toast.error('Erro ao criar cotação') }
  }

  // ─── Modal Orçamento ──────────────────────────────────────────────────────
  async function abrirModalOrcamento() {
    if (!cardSelecionado) return

    // Fetch client details
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
      .eq('id', cardSelecionado.cliente_id)
      .maybeSingle()

    setClienteCompleto(cliente as ClienteCompleto | null)

    // Buscar fornecedores ativos para associação
    const fornecedoresCarregados = await buscarFornecedoresDisponiveis()

    setItensOrcamento([{
      id: Date.now(),
      codigo: '',
      descricao: '',
      medidas: '',
      especificacoes: '',
      quantidade: 1,
      preco_unitario: 0,
      total: 0,
    }])
    setDadosOrcamento({
      prazo_entrega: '45/60 dias',
      validade_dias: 30,
      frete: 0,
      frete_tipo: 'CIF (Incluso)',
      impostos: 0,
      desconto: 0,
      condicoes_pagamento: 'ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\n- para 30/60/90/120/150 acréscimo de 3,80%\n- para 30/60/90/120/150/180 acréscimo de 4,20%\n- para 30/60/90/120/150/180/210 acréscimo de 4,80%\n- para 30/60/90/120/150/180/210/240 acréscimo de 5,20%\n- para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%\n- para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.',
      observacoes: '',
      observacoes_gerais: '',
      difal_texto: 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.',
    })
    // Auto-select operação from card (using freshly loaded fornecedores)
    if (cardSelecionado.operacao) {
      selecionarOperacao(cardSelecionado.operacao, fornecedoresCarregados)
    } else {
      setOperacaoSelecionada('')
      setFornecedorSelecionado(null)
    }
    setImagensAdicionais([])
    setImagensAdicionaisPreview([])
    setModalOrcamento(true)
  }

  async function buscarFornecedoresDisponiveis(): Promise<FornecedorLocal[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, nome_fantasia, codigo, gestao, termos_fabricante, produtos_servicos, prazo_entrega_padrao, validade_dias_padrao, condicoes_pagamento_padrao, imagem_template_url, tipo_layout')
      .eq('status', 'ativo')
      .order('nome_fantasia')

    if (!error && data) {
      setFornecedoresDisponiveis(data as FornecedorLocal[])
      return data as FornecedorLocal[]
    }
    return []
  }

  function selecionarOperacao(operacao: string, listaFornecedores?: FornecedorLocal[]) {
    setOperacaoSelecionada(operacao)
    if (!operacao) {
      setFornecedorSelecionado(null)
      setImagemMarketing(null)
      return
    }

    // Use provided list (fresh from DB) or fall back to state
    const lista = listaFornecedores || fornecedoresDisponiveis
    const fornecedor = lista.find(
      f => f.nome_fantasia.toUpperCase() === operacao.toUpperCase()
    )

    setFornecedorSelecionado(fornecedor || null)

    if (!fornecedor) {
      setImagemMarketing(null)
      return
    }

    // Aplicar defaults do fornecedor
    const isMidea = isFornecedorMidea(fornecedor)
    setDadosOrcamento(prev => ({
      ...prev,
      prazo_entrega: fornecedor.prazo_entrega_padrao || prev.prazo_entrega,
      validade_dias: fornecedor.validade_dias_padrao || prev.validade_dias,
      condicoes_pagamento: isMidea
        ? resolverCondicoesPagamentoMidea(fornecedor.condicoes_pagamento_padrao)
        : (fornecedor.condicoes_pagamento_padrao || prev.condicoes_pagamento),
    }))

    const imagemPadrao = resolverImagemMarketing(null, fornecedor.imagem_template_url, isMidea)
    if (imagemPadrao) {
      setImagemMarketing({
        preview: imagemPadrao,
        nome: `Imagem padrão ${fornecedor.nome_fantasia}`,
        tamanho: 0,
        file: null,
        ehPadrao: true,
      })
    } else {
      setImagemMarketing(null)
    }

    toast.success(`Fornecedor ${fornecedor.nome_fantasia} vinculado automaticamente`)
  }

  function adicionarItem() {
    setItensOrcamento(prev => [...prev, {
      id: Date.now(),
      codigo: '',
      descricao: '',
      medidas: '',
      especificacoes: '',
      quantidade: 1,
      preco_unitario: 0,
      total: 0,
    }])
  }

  function removerItem(id: number) {
    setItensOrcamento(prev => prev.filter(item => item.id !== id))
  }

  function atualizarItem(id: number, campo: string, valor: string | number) {
    setItensOrcamento(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [campo]: valor }
        // Parse quantidade and preco_unitario as numbers for total calc
        const qty = typeof updated.quantidade === 'string' ? parseFloat(String(updated.quantidade).replace(',', '.')) || 0 : updated.quantidade
        const price = typeof updated.preco_unitario === 'string' ? parseFloat(String(updated.preco_unitario).replace(',', '.')) || 0 : updated.preco_unitario
        updated.total = qty * price
        return updated
      }
      return item
    }))
  }

  function handleImagensAdicionais(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} não é uma imagem`); return false }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} excede 5MB`); return false }
      return true
    })
    setImagensAdicionais(prev => [...prev, ...validFiles])
    setImagensAdicionaisPreview(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
  }

  function removerImagemAdicional(index: number) {
    URL.revokeObjectURL(imagensAdicionaisPreview[index])
    setImagensAdicionais(prev => prev.filter((_, i) => i !== index))
    setImagensAdicionaisPreview(prev => prev.filter((_, i) => i !== index))
  }

  function handleImagemMarketing(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB')
      return
    }
    setImagemMarketing({
      preview: URL.createObjectURL(file),
      nome: file.name,
      tamanho: file.size,
      file,
      ehPadrao: false,
    })
  }

  function removerImagemMarketing() {
    if (imagemMarketing && !imagemMarketing.ehPadrao && imagemMarketing.preview) {
      URL.revokeObjectURL(imagemMarketing.preview)
    }
    setImagemMarketing(null)
  }

  function calcularSubtotal() {
    return itensOrcamento.reduce((sum, item) => sum + item.total, 0)
  }

  function calcularValorImpostos() {
    const subtotal = calcularSubtotal()
    const impostos = Number(dadosOrcamento.impostos) || 0
    return subtotal * (impostos / 100)
  }

  function calcularValorDesconto() {
    const subtotal = calcularSubtotal()
    return subtotal * ((Number(dadosOrcamento.desconto) || 0) / 100)
  }

  function calcularTotal() {
    const subtotal = calcularSubtotal()
    const frete = Number(dadosOrcamento.frete) || 0
    const valorImpostos = calcularValorImpostos()
    const valorDesconto = calcularValorDesconto()
    return subtotal + valorImpostos - valorDesconto + frete
  }

  async function gerarOrcamento() {
    if (!cardSelecionado) return

    if (!operacaoSelecionada) {
      toast.error('Selecione um fornecedor')
      return
    }

    if (!clienteCompleto?.logradouro || !clienteCompleto?.numero) {
      toast.error('Endereço completo do cliente é obrigatório. Atualize o cadastro do cliente.')
      return
    }

    if (itensOrcamento.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento')
      return
    }

    const itensInvalidos = itensOrcamento.filter(item => {
      const qty = parseFloat(String(item.quantidade).replace(',', '.')) || 0
      const price = parseFloat(String(item.preco_unitario).replace(',', '.')) || 0
      return !item.descricao || qty < 1 || price <= 0
    })
    if (itensInvalidos.length > 0) {
      toast.error('Preencha todos os campos obrigatórios dos itens')
      return
    }

    try {
      // 1. Gerar número do orçamento (numérico sequencial a partir de 13001)
      const { data: ultimoOrc } = await supabase
        .from('orcamentos')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle()

      let proximoSeq = 13001
      if (ultimoOrc?.numero) {
        const numerico = parseInt(ultimoOrc.numero, 10)
        if (!isNaN(numerico) && numerico >= 13001) {
          proximoSeq = numerico + 1
        }
      }
      const numero = String(proximoSeq)

      // 2. Calcular valores ANTES de salvar - garantir parsing numérico
      const subtotal = itensOrcamento.reduce((sum, item) => {
        const itemTotal = parseFloat(String(item.total).replace(',', '.')) || 0
        return sum + itemTotal
      }, 0)
      const impPerc = parseFloat(String(dadosOrcamento.impostos).replace(',', '.')) || 0
      const descPerc = parseFloat(String(dadosOrcamento.desconto).replace(',', '.')) || 0
      const valorImpostos = subtotal * (impPerc / 100)
      const valorDesconto = subtotal * (descPerc / 100)
      const valorFrete = parseFloat(String(dadosOrcamento.frete).replace(',', '.')) || 0
      const total = subtotal + valorImpostos - valorDesconto + valorFrete

      console.log('💰 VALORES CALCULADOS:', { subtotal, impPerc, valorImpostos, descPerc, valorDesconto, valorFrete, total, itensDetails: itensOrcamento.map(i => ({ desc: i.descricao, qty: i.quantidade, price: i.preco_unitario, total: i.total })) })

      // 3. Calcular data de validade (usando horário de Brasília)
      const agora = new Date()
      // Formata como YYYY-MM-DD no fuso de São Paulo
      const hojeStr = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const hoje = new Date(hojeStr + 'T12:00:00')
      const dataValidade = new Date(hoje)
      dataValidade.setDate(dataValidade.getDate() + dadosOrcamento.validade_dias)

      // 4. Preparar endereço completo
      const enderecoCompleto = `${clienteCompleto.logradouro}, ${clienteCompleto.numero}${clienteCompleto.complemento ? ' - ' + clienteCompleto.complemento : ''}, ${clienteCompleto.bairro}, ${clienteCompleto.cidade}/${clienteCompleto.estado} - CEP: ${clienteCompleto.cep || 'Não informado'}`

      // 5. Preparar termos 3W
      const termos3w = TERMOS_3W.replace('[VALIDADE]', String(dadosOrcamento.validade_dias))

      // 5b. Upload imagem marketing (se houver)
      let imagemMarketingUrl: string | null = null
      if (imagemMarketing) {
        if (imagemMarketing.ehPadrao) {
          // Imagem padrão do fornecedor — usar URL direta
          imagemMarketingUrl = imagemMarketing.preview
        } else if (imagemMarketing.file) {
          // Upload de arquivo novo
          setUploadingImagem(true)
          const ext = imagemMarketing.nome.split('.').pop()
          const path = `${numero.replace(/\s/g, '_')}_${Date.now()}.${ext}`
          const { error: uploadError } = await supabaseCloud.storage
            .from('orcamentos-marketing')
            .upload(path, imagemMarketing.file)
          setUploadingImagem(false)
          if (uploadError) {
            console.error('Upload error:', uploadError)
            toast.error('Erro ao fazer upload da imagem de marketing')
          } else {
            const { data: urlData } = supabaseCloud.storage
              .from('orcamentos-marketing')
              .getPublicUrl(path)
            imagemMarketingUrl = urlData.publicUrl
          }
        }
      }

      console.log('📋 PAYLOAD ANTES DO INSERT:')
      console.log('subtotal:', subtotal, typeof subtotal)
      console.log('impostos:', valorImpostos, typeof valorImpostos)
      console.log('desconto:', valorDesconto, typeof valorDesconto)
      console.log('frete:', valorFrete, typeof valorFrete)
      console.log('total:', total, typeof total)
      console.log('impPerc:', impPerc, 'descPerc:', descPerc)

      const condicoesPagamentoTexto = isFornecedorMidea(fornecedorSelecionado)
        ? resolverCondicoesPagamentoMidea(dadosOrcamento.condicoes_pagamento)
        : dadosOrcamento.condicoes_pagamento
      const condicoesPagamento = montarCondicoesPagamentoPayload(condicoesPagamentoTexto)

      const orcamentoPayload: Record<string, unknown> = {
        numero,
        card_id: cardSelecionado.id,
        cliente_id: cardSelecionado.cliente_id,
        cliente_nome: clienteCompleto.nome_fantasia || cardSelecionado.cliente_nome,
        cliente_razao_social: clienteCompleto.razao_social,
        cliente_cnpj: clienteCompleto.cnpj || cardSelecionado.cliente_cnpj,
        cliente_endereco: enderecoCompleto,
        cliente_email: clienteCompleto.email,
        cliente_telefone: clienteCompleto.telefone,
        fornecedor_id: fornecedorSelecionado?.id || null,
        fornecedor_nome: fornecedorSelecionado?.nome_fantasia || null,
        operacao: operacaoSelecionada,
        gestao: cardSelecionado.gestao,
        codigo_empresa: fornecedorSelecionado?.codigo || null,
        subtotal: isNaN(subtotal) ? 0 : Number(subtotal),
        frete: isNaN(valorFrete) ? 0 : Number(valorFrete),
        frete_tipo: dadosOrcamento.frete_tipo,
        impostos: isNaN(valorImpostos) ? 0 : Number(valorImpostos),
        impostos_percentual: isNaN(impPerc) ? 0 : Number(impPerc),
        desconto: isNaN(valorDesconto) ? 0 : Number(valorDesconto),
        desconto_percentual: isNaN(descPerc) ? 0 : Number(descPerc),
        desconto_valor: isNaN(valorDesconto) ? 0 : Number(valorDesconto),
        total: isNaN(total) ? 0 : Number(total),
        prazo_entrega: dadosOrcamento.prazo_entrega,
        validade_dias: dadosOrcamento.validade_dias,
        data_validade: dataValidade.toISOString(),
        data_emissao: hoje.toISOString(),
        condicoes_pagamento: condicoesPagamento,
        observacoes: dadosOrcamento.observacoes,
        observacoes_gerais: dadosOrcamento.observacoes_gerais,
        difal_texto: dadosOrcamento.difal_texto,
        termos_3w: termos3w,
        termos_fornecedor: resolverTermosFornecedor(
          fornecedorSelecionado?.termos_fabricante,
          isFornecedorMidea(fornecedorSelecionado)
        ),
        imagem_marketing_url: imagemMarketingUrl,
        status: 'rascunho',
      }

      console.log('🔑 PAYLOAD COMPLETO:', JSON.stringify(orcamentoPayload, null, 2))

      async function inserirOrcamentoComFallback(payloadBase: Record<string, unknown>) {
        const payload = { ...payloadBase }

        for (let tentativa = 0; tentativa < 20; tentativa += 1) {
          const { data, error } = await supabase
            .from('orcamentos')
            .insert(payload as any)
            .select()
            .single()

          if (!error) return data

          const colunaAusente = error.code === 'PGRST204'
            ? error.message.match(/Could not find the '([^']+)' column/)?.[1]
            : null

          if (colunaAusente && colunaAusente in payload) {
            console.warn(`⚠️ Removendo campo ausente no schema: ${colunaAusente} = ${JSON.stringify(payload[colunaAusente])}`)
            delete payload[colunaAusente as keyof typeof payload]
            continue
          }

          throw error
        }

        throw new Error('Falha ao inserir orçamento: schema incompatível com os campos atuais.')
      }

      const orcamento = await inserirOrcamentoComFallback(orcamentoPayload)

      if (orcamento) {
        console.log('✅ ORÇAMENTO SALVO COM SUCESSO:', JSON.stringify(orcamento, null, 2))
        console.log('💰 Valores no retorno: subtotal=', orcamento.subtotal, 'total=', orcamento.total, 'impostos=', orcamento.impostos, 'desconto=', orcamento.desconto)
        if (orcamento.total === 0 || orcamento.subtotal === 0) {
          console.error('⚠️ VALORES ZERADOS NO RETORNO! O banco não salvou os valores corretamente')
        }
      }

      // 7. Criar itens do orçamento
      const itensParaInserir = itensOrcamento
        .filter(i => i.descricao.trim())
        .map((item, index) => ({
          orcamento_id: orcamento.id,
          codigo: item.codigo || null,
          descricao: item.descricao,
          medidas: item.medidas || null,
          especificacoes: item.especificacoes || null,
          quantidade: parseFloat(String(item.quantidade).replace(/\./g, '').replace(',', '.')) || 0,
          preco_unitario: parseFloat(String(item.preco_unitario).replace(/\./g, '').replace(',', '.')) || 0,
          total: isNaN(item.total) ? 0 : Number(item.total),
          ordem: index,
        }))

      const { error: erroItens } = await supabase.from('orcamento_itens').insert(itensParaInserir)
      if (erroItens) throw erroItens

      // 8. Registrar no log
      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado.id,
        acao: 'orcamento_gerado',
        descricao: `Orçamento ${numero} gerado - Total: ${formatCurrency(total)}`,
      })

      toast.success(`Orçamento ${numero} gerado com sucesso!`)
      setModalOrcamento(false)

      // Limpar estados
      setItensOrcamento([])
      setDadosOrcamento({
        prazo_entrega: '45/60 dias',
        validade_dias: 30,
        frete: 0,
        frete_tipo: 'CIF (Incluso)',
        impostos: 0,
        desconto: 0,
        condicoes_pagamento: '',
        observacoes: '',
        observacoes_gerais: '',
        difal_texto: 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.',
      })
      setClienteCompleto(null)
      setFornecedorSelecionado(null)
      setOperacaoSelecionada('')
      setFornecedoresDisponiveis([])
      removerImagemMarketing()

      buscarDocumentos(cardSelecionado.id)
      buscarMetricas()

      if (confirm('Orçamento criado! Deseja visualizar agora?')) {
        window.location.href = '/orcamentos'
      }
    } catch (error) {
      console.error(error)
      const mensagem = typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Erro ao gerar orçamento'
      toast.error(mensagem)
    }
  }

  async function gerarContrato() {
    try {
      const { data: orcamento } = await supabase.from('documentos_comerciais').select('*')
        .eq('card_id', cardSelecionado!.id).eq('tipo', 'orcamento').eq('status', 'aprovado')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!orcamento) { toast.error('É necessário ter um orçamento aprovado'); return }
      const numero = `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const { data, error } = await supabase.from('documentos_comerciais').insert({
        card_id: cardSelecionado!.id,
        cliente_id: cardSelecionado!.cliente_id,
        tipo: 'contrato', numero,
        titulo: `Contrato ${cardSelecionado!.operacao} - ${cardSelecionado!.cliente_nome}`,
        status: 'rascunho', valor_total: orcamento.valor_total,
        conteudo: { baseado_orcamento: orcamento.numero, valor_total: orcamento.valor_total },
      }).select().single()
      if (error) throw error
      await supabase.from('acoes_comerciais_log').insert({
        card_id: cardSelecionado!.id, documento_id: data.id,
        acao: 'contrato_gerado', descricao: `Contrato ${numero} gerado`,
      })
      toast.success('Contrato gerado com sucesso!')
      buscarDocumentos(cardSelecionado!.id)
      buscarMetricas()
    } catch (err) { console.error(err); toast.error('Erro ao gerar contrato') }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#dbdbdb] -m-6">
      {/* HEADER */}
      <div className="p-6 border-b bg-[#dbdbdb]">
        <h1 className="text-2xl font-bold text-[#1a4168]">Ações Comerciais</h1>
        <p className="text-sm text-muted-foreground">Gerencie cotações, orçamentos e contratos</p>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b bg-muted/30">
        <MetricCard icon={<FileText className="w-5 h-5" />} titulo="Cotações Pendentes" valor={metricas.cotacoesPendentes} cor="blue" />
        <MetricCard icon={<DollarSign className="w-5 h-5" />} titulo="Orçamentos Enviados" valor={metricas.orcamentosEnviados} cor="green" />
        <MetricCard icon={<FileSignature className="w-5 h-5" />} titulo="Contratos em Análise" valor={metricas.contratosAnalise} cor="orange" />
        <MetricCard icon={<DollarSign className="w-5 h-5" />} titulo="Valor Total" valor={`R$ ${(metricas.valorTotal / 1000).toFixed(0)}k`} cor="purple" />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} titulo="Taxa Conversão" valor={`${metricas.taxaConversao}%`} cor="teal" />
        <MetricCard icon={<Clock className="w-5 h-5" />} titulo="Tempo Médio" valor={`${metricas.tempoMedio} dias`} cor="gray" />
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
                <p className="text-sm mt-1">Clique em um cliente no painel à esquerda</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PREPARAR ORÇAMENTO */}
      <Dialog open={modalOrcamento} onOpenChange={setModalOrcamento}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preparar Orçamento</DialogTitle>
            <DialogDescription>
              {cardSelecionado?.cliente_nome} - {cardSelecionado?.operacao}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* INFO DO CLIENTE (readonly) */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{cardSelecionado?.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{cardSelecionado?.cliente_cnpj}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <Badge>{cardSelecionado?.operacao}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Gestão</p>
                  <Badge variant="outline">{cardSelecionado?.gestao}</Badge>
                </div>
              </div>
            </div>

            {/* FORNECEDOR (auto-selecionado) */}
            <div className="bg-card border-2 border-primary/20 rounded-lg p-4">
              <Label>Fornecedor</Label>
              <div className="mt-1 flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                {operacaoSelecionada || cardSelecionado?.operacao || 'Não definido'}
              </div>

              {fornecedorSelecionado && (
                <div className="mt-3 p-3 bg-primary/5 rounded space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fornecedor vinculado:</span>
                    <span className="font-medium">{fornecedorSelecionado.nome_fantasia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-medium">{fornecedorSelecionado.codigo || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gestão:</span>
                    <Badge>{fornecedorSelecionado.gestao}</Badge>
                  </div>
                  {fornecedorSelecionado.termos_fabricante && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-primary hover:text-primary/80">
                        Ver termos do fabricante
                      </summary>
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {fornecedorSelecionado.termos_fabricante}
                      </p>
                    </details>
                  )}
                </div>
              )}

              {operacaoSelecionada && !fornecedorSelecionado && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum fornecedor vinculado
                </p>
              )}
            </div>

            {/* DADOS DO ORÇAMENTO */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prazo de Entrega *</Label>
                <Input
                  placeholder="Ex: 45/60 dias"
                  value={dadosOrcamento.prazo_entrega}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, prazo_entrega: e.target.value }))}
                />
              </div>
              <div>
                <Label>Validade (dias) *</Label>
                <Input
                  type="number"
                  value={dadosOrcamento.validade_dias}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, validade_dias: parseInt(e.target.value) || 30 }))}
                />
              </div>
              <div>
                <Label>Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={dadosOrcamento.frete || ''}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, frete: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* IMPOSTOS, DESCONTO, TIPO DE FRETE */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Impostos (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={dadosOrcamento.impostos || ''}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, impostos: Number(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor: {formatCurrency(calcularValorImpostos())}
                </p>
              </div>
              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={dadosOrcamento.desconto || ''}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor: -{formatCurrency(calcularValorDesconto())}
                </p>
              </div>
              <div>
                <Label>Tipo de Frete</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={dadosOrcamento.frete_tipo}
                  onChange={(e) => setDadosOrcamento(prev => ({ ...prev, frete_tipo: e.target.value }))}
                >
                  <option value="CIF (Incluso)">CIF (Incluso)</option>
                  <option value="FOB">FOB</option>
                  <option value="A calcular">A calcular</option>
                </select>
              </div>
            </div>

            {/* ITENS DO ORÇAMENTO */}
            <div>
              <Label className="mb-3 block">Itens do Orçamento</Label>

              <div className="space-y-3">
                {itensOrcamento.map((item, index) => (
                  <OrcamentoItemRow
                    key={item.id}
                    item={{ ...item, id: String(item.id) }}
                    index={index}
                    canRemove={itensOrcamento.length > 1}
                    tipoLayout={fornecedorSelecionado?.tipo_layout}
                    onUpdate={(id, campo, valor) => atualizarItem(Number(id), campo, valor)}
                    onRemove={(id) => removerItem(Number(id))}
                  />
                ))}
              </div>

              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={adicionarItem}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {/* CONDIÇÕES DE PAGAMENTO */}
            <div>
              <Label>Condições de Pagamento</Label>
              <Textarea
                placeholder="Ex: À vista antecipado (sem acréscimo) ou Em 3x (30/60/90 dias) com acréscimo de 2,5%"
                value={dadosOrcamento.condicoes_pagamento}
                onChange={(e) => setDadosOrcamento(prev => ({ ...prev, condicoes_pagamento: e.target.value }))}
                rows={3}
              />
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={dadosOrcamento.observacoes}
                onChange={(e) => setDadosOrcamento(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* OBSERVAÇÕES GERAIS */}
            <div>
              <Label>Observações Gerais</Label>
              <Textarea
                placeholder="Observações adicionais que aparecerão em destaque no orçamento..."
                value={dadosOrcamento.observacoes_gerais}
                onChange={(e) => setDadosOrcamento(prev => ({ ...prev, observacoes_gerais: e.target.value }))}
                rows={3}
              />
            </div>

            {/* DIFAL */}
            <div>
              <Label>Texto DIFAL</Label>
              <Textarea
                placeholder="Texto sobre DIFAL/tributação..."
                value={dadosOrcamento.difal_texto}
                onChange={(e) => setDadosOrcamento(prev => ({ ...prev, difal_texto: e.target.value }))}
                rows={3}
              />
            </div>

            {/* ÁREA DE MARKETING */}
            <div className="border-2 border-dashed border-[#c4942c]/40 rounded-lg p-6 bg-[#c4942c]/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[#c4942c] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Área de Marketing
                  </h3>
                  <p className="text-sm text-[#c4942c]/70 mt-1">
                    Adicione uma campanha visual do fornecedor (hero/banner)
                  </p>
                </div>
                
                <label className="inline-flex cursor-pointer">
                  <Button type="button" variant="outline" className="border-[#c4942c]/50 text-[#c4942c] hover:bg-[#c4942c]/10" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {imagemMarketing ? 'Trocar Imagem' : 'Upload Campanha'}
                    </span>
                  </Button>
                  <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleImagemMarketing} />
                </label>
              </div>
              
              {imagemMarketing ? (
                <div className="relative">
                  <img 
                    src={imagemMarketing.preview} 
                    alt="Campanha Marketing" 
                    className="w-full rounded-lg shadow-md"
                  />
                  
                  <div className="absolute top-2 right-2 flex gap-2">
                    {imagemMarketing.ehPadrao && (
                      <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold">
                        Imagem Padrão
                      </span>
                    )}
                    
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removerImagemMarketing}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Nome: {imagemMarketing.nome}</p>
                    {imagemMarketing.tamanho > 0 && (
                      <p>Tamanho: {(imagemMarketing.tamanho / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#c4942c]">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma campanha adicionada</p>
                  <p className="text-xs text-[#c4942c]/60 mt-1">
                    JPG, PNG • Máx 5MB • Recomendado: 1200x400px
                  </p>
                </div>
              )}
            </div>

            {/* IMAGENS ADICIONAIS */}
            <div className="bg-card border-2 border-dashed border-primary/20 rounded-lg p-4">
              <Label className="mb-2 block">Imagens Adicionais</Label>
              {imagensAdicionaisPreview.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {imagensAdicionaisPreview.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Adicional ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removerImagemAdicional(i)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-flex cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    Adicionar Imagens
                  </span>
                </Button>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagensAdicionais} />
              </label>
            </div>

            {/* RESUMO FINANCEIRO */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Resumo Financeiro</h3>
              
              <div className="space-y-3">
                {/* SUBTOTAL */}
                <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-lg">{formatCurrency(calcularSubtotal())}</span>
                </div>
                
                {/* IMPOSTOS */}
                <div className="flex justify-between items-center">
                  <span className="text-[#c4942c]">
                    Impostos {dadosOrcamento.impostos > 0 && `(${dadosOrcamento.impostos}%)`}:
                  </span>
                  <span className="font-semibold text-[#c4942c]">
                    +{formatCurrency(calcularValorImpostos())}
                  </span>
                </div>
                
                {/* DESCONTO */}
                {dadosOrcamento.desconto > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">
                      Desconto ({dadosOrcamento.desconto}%):
                    </span>
                    <span className="font-semibold text-green-700">
                      -{formatCurrency(calcularValorDesconto())}
                    </span>
                  </div>
                )}
                
                {/* FRETE */}
                <div className="flex justify-between items-center pb-3 border-b-2 border-gray-400">
                  <span className="text-blue-700">Frete:</span>
                  <span className="font-semibold text-blue-700">
                    +{formatCurrency(dadosOrcamento.frete || 0)}
                  </span>
                </div>
                
                {/* TOTAL */}
                <div className="flex justify-between items-center pt-2 bg-[#1E4A7C] text-white rounded-lg p-4 -mx-2">
                  <span className="font-bold text-lg">VALOR TOTAL:</span>
                  <span className="font-bold text-3xl">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOrcamento(false)}>
              Cancelar
            </Button>
            <Button onClick={gerarOrcamento}>
              Gerar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
