import { supabase } from '@/lib/supabase'
import { supabase as cloudSupabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Orcamento, OrcamentoItem } from '@/lib/types'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Eye, Send, Edit, Download,
  Trash2, Filter, Search, Printer, X, Mail, MessageCircle, ChevronDown,
  Paperclip, RotateCcw, Loader2
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { OrcamentoTemplate } from '@/components/OrcamentoTemplate'
import { EditarOrcamentoModal } from '@/components/orcamentos/EditarOrcamentoModal'
import { extrairTextoCondicoesPagamento } from '@/lib/condicoesPagamento'
import { formatDateBR } from '@/lib/date'
import { resolverCondicoesPagamentoMidea, resolverImagemMarketing, resolverTermosFornecedor } from '@/lib/fornecedorTerms'

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

function formatDate(date: string | null | undefined) {
  return formatDateBR(date)
}

interface ClienteAtual {
  id: string
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

function montarEnderecoCliente(cliente?: ClienteAtual | null) {
  if (!cliente) return null

  const logradouroNumero = [cliente.logradouro, cliente.numero].filter(Boolean).join(', ')
  const cidadeEstado = [cliente.cidade, cliente.estado].filter(Boolean).join('/')
  const partes = [
    logradouroNumero,
    cliente.complemento,
    cliente.bairro,
    cidadeEstado,
    cliente.cep ? `CEP: ${cliente.cep}` : null,
  ].filter(Boolean)

  return partes.length > 0 ? partes.join(' - ') : null
}

function aplicarDadosClienteNoOrcamento(orcamento: Orcamento, cliente?: ClienteAtual | null): Orcamento {
  if (!cliente) return orcamento

  return {
    ...orcamento,
    cliente_nome: cliente.nome_fantasia || orcamento.cliente_nome,
    cliente_razao_social: cliente.razao_social || orcamento.cliente_razao_social,
    cliente_cnpj: cliente.cnpj || orcamento.cliente_cnpj,
    cliente_endereco: montarEnderecoCliente(cliente) || orcamento.cliente_endereco,
    cliente_email: cliente.email || orcamento.cliente_email,
    cliente_telefone: cliente.telefone || orcamento.cliente_telefone,
  }
}

export default function Orcamentos() {
  const { user } = useAuth()
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
  const [modalEnviar, setModalEnviar] = useState(false)
  const [orcamentoEnviar, setOrcamentoEnviar] = useState<Orcamento | null>(null)
  const [emailDestinatarios, setEmailDestinatarios] = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailMensagem, setEmailMensagem] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)

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

      // Enrich: sempre usar os dados atuais do cliente pelo cliente_id
      const clienteIds = [...new Set(rows.filter(r => r.cliente_id).map(r => r.cliente_id))]
      let clienteMap: Record<string, ClienteAtual> = {}
      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase
          .from('clientes')
          .select('id, nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
          .in('id', clienteIds)
        if (clientes) {
          clienteMap = Object.fromEntries(clientes.map((c: any) => [c.id, c as ClienteAtual]))
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

      // Map rows, priorizando snapshot atual do cliente
      const enrichedRows = rows.map((r: any) => {
        const cliente = clienteMap[r.cliente_id]
        const card = cardMap[r.cliente_id]

        const orcamentoBase = {
          ...r,
          fornecedor_nome: r.fornecedor_nome || card?.operacao || '',
          operacao: r.operacao || card?.operacao || null,
          gestao: r.gestao || card?.gestao || null,
          total: parseNum(r.total) || parseNum(r.valor_total) || 0,
          subtotal: parseNum(r.subtotal) || parseNum(r.valor_produtos) || 0,
          frete: parseNum(r.frete) || parseNum(r.valor_frete) || 0,
          desconto: parseNum(r.desconto) || parseNum(r.valor_desconto) || 0,
        } as Orcamento

        return aplicarDadosClienteNoOrcamento(orcamentoBase, cliente)
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

  async function buscarFornecedorLayout(orcamentoBase: Orcamento) {
    const fornecedorId = (orcamentoBase as any).fornecedor_id
    const nomeBusca = String((orcamentoBase as any).fornecedor_nome || (orcamentoBase as any).operacao || '').trim()

    if (fornecedorId) {
      const { data } = await supabase
        .from('fornecedores')
        .select('tipo_layout, nome_fantasia, logotipo_url, imagem_template_url')
        .eq('id', fornecedorId)
        .maybeSingle()

      if (data) {
        return data as {
          tipo_layout: string | null
          nome_fantasia: string
          logotipo_url: string | null
          imagem_template_url: string | null
        }
      }
    }

    if (!nomeBusca) return null

    const { data: exato } = await supabase
      .from('fornecedores')
      .select('tipo_layout, nome_fantasia, logotipo_url, imagem_template_url')
      .eq('nome_fantasia', nomeBusca)
      .maybeSingle()

    if (exato) {
      return exato as {
        tipo_layout: string | null
        nome_fantasia: string
        logotipo_url: string | null
        imagem_template_url: string | null
      }
    }

    const { data: caseInsensitive } = await supabase
      .from('fornecedores')
      .select('tipo_layout, nome_fantasia, logotipo_url, imagem_template_url')
      .ilike('nome_fantasia', nomeBusca)
      .limit(1)

    if (caseInsensitive && caseInsensitive.length > 0) {
      return caseInsensitive[0] as {
        tipo_layout: string | null
        nome_fantasia: string
        logotipo_url: string | null
        imagem_template_url: string | null
      }
    }

    const { data: parcial } = await supabase
      .from('fornecedores')
      .select('tipo_layout, nome_fantasia, logotipo_url, imagem_template_url')
      .ilike('nome_fantasia', `%${nomeBusca}%`)
      .limit(1)

    return parcial && parcial.length > 0
      ? (parcial[0] as {
          tipo_layout: string | null
          nome_fantasia: string
          logotipo_url: string | null
          imagem_template_url: string | null
        })
      : null
  }

  async function carregarOrcamentoCompleto(o: Orcamento) {
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

    const [fornecedor, { data: itens }, { data: clienteAtual }] = await Promise.all([
      buscarFornecedorLayout(orcamentoBase),
      supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', o.id)
        .order('ordem'),
      orcamentoBase.cliente_id
        ? supabase
            .from('clientes')
            .select('id, nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
            .eq('id', orcamentoBase.cliente_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const orcamentoComCliente = aplicarDadosClienteNoOrcamento(
      orcamentoBase,
      (clienteAtual as ClienteAtual | null) ?? null
    )

    const orcamentoComFornecedor = fornecedor
      ? ({
          ...orcamentoComCliente,
          fornecedor_tipo_layout: fornecedor.tipo_layout,
          fornecedor_logotipo_url: fornecedor.logotipo_url,
          fornecedor_nome_fantasia: fornecedor.nome_fantasia,
          fornecedor_imagem_template_url: fornecedor.imagem_template_url,
        } as Orcamento)
      : orcamentoComCliente

    return {
      orcamento: orcamentoComFornecedor,
      itens: ((itens as OrcamentoItem[]) || []).sort((a, b) => a.ordem - b.ordem),
    }
  }

  async function visualizarOrcamento(o: Orcamento) {
    const { orcamento, itens } = await carregarOrcamentoCompleto(o)
    setOrcamentoVisualizar(orcamento)
    setItensVisualizar(itens)
    setModalVisualizar(true)
  }

  function editarOrcamento(o: Orcamento) {
    setOrcamentoEditarId(o.id)
    setModalEditar(true)
  }

  async function aguardarRenderCompleto(container: HTMLElement) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const imagens = Array.from(container.querySelectorAll('img'))
    await Promise.all(
      imagens.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          let finalizado = false
          const concluir = () => {
            if (finalizado) return
            finalizado = true
            resolve()
          }
          img.addEventListener('load', concluir, { once: true })
          img.addEventListener('error', concluir, { once: true })
          setTimeout(concluir, 3500)
        })
      })
    )
  }

  async function aguardarConteudoEstavel(container: HTMLElement) {
    let assinaturaAnterior = ''

    for (let tentativa = 0; tentativa < 14; tentativa++) {
      await aguardarRenderCompleto(container)

      const imagens = Array.from(container.querySelectorAll('img'))
      const assinaturaAtual = `${container.querySelectorAll('*').length}-${imagens.length}-${container.textContent?.length || 0}`
      const imagensCarregadas = imagens.every((img) => img.complete)

      if (assinaturaAtual === assinaturaAnterior && imagensCarregadas) {
        return
      }

      assinaturaAnterior = assinaturaAtual
      await new Promise((resolve) => setTimeout(resolve, 180))
    }
  }

  async function obterConteudoParaExportacao(orcamento?: Orcamento): Promise<HTMLElement | null> {
    if (orcamento && (!modalVisualizar || orcamentoVisualizar?.id !== orcamento.id)) {
      await visualizarOrcamento(orcamento)
    }

    let elemento: HTMLElement | null = null
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      elemento = document.getElementById('orcamento-conteudo') as HTMLElement | null
      if (elemento) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (!elemento) {
      toast.error('Não foi possível renderizar o orçamento para exportação')
      return null
    }

    await aguardarConteudoEstavel(elemento)
    return elemento
  }

  function criarCloneParaExportacao(containerOriginal: HTMLElement) {
    const A4_WIDTH_PX = 794
    const A4_HEIGHT_PX = 1123

    const host = document.createElement('div')
    host.id = 'orcamento-export-host'
    host.style.position = 'fixed'
    host.style.left = '0'
    host.style.top = '0'
    host.style.width = '100vw'
    host.style.height = '100vh'
    host.style.overflow = 'auto'
    host.style.opacity = '0'
    host.style.pointerEvents = 'none'
    host.style.zIndex = '-1'
    host.style.background = '#ffffff'

    const clone = containerOriginal.cloneNode(true) as HTMLElement
    clone.id = 'orcamento-export-clone'
    clone.style.width = `${A4_WIDTH_PX}px`
    clone.style.maxWidth = `${A4_WIDTH_PX}px`
    clone.style.minWidth = `${A4_WIDTH_PX}px`
    clone.style.maxHeight = 'none'
    clone.style.overflow = 'visible'
    clone.style.margin = '0 auto'
    clone.style.background = '#ffffff'

    const style = document.createElement('style')
    style.textContent = `
      #orcamento-export-clone,
      #orcamento-export-clone * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #orcamento-export-clone .max-w-7xl {
        max-width: 100% !important;
      }
      #orcamento-export-clone .page-break:first-child .max-w-7xl > div:first-child {
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }
      #orcamento-export-clone .page-break:first-child .max-w-7xl > div:last-child {
        flex: 0 0 auto !important;
      }
      #orcamento-export-clone .bg-\\[\\#1a4168\\] {
        background-color: #1a4168 !important;
        color: #ffffff !important;
      }
      #orcamento-export-clone .bg-\\[\\#c4942c\\] {
        background-color: #c4942c !important;
        color: #ffffff !important;
      }
      #orcamento-export-clone .bg-\\[\\#c4942c\\] * {
        color: #ffffff !important;
      }
      #orcamento-export-clone .page-break {
        width: ${A4_WIDTH_PX}px !important;
        min-height: ${A4_HEIGHT_PX}px !important;
        margin: 0 auto !important;
        break-after: page;
        page-break-after: always;
        overflow: hidden;
        box-sizing: border-box;
      }
      #orcamento-export-clone .page-break:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    `

    host.appendChild(style)
    host.appendChild(clone)
    document.body.appendChild(host)

    return {
      clone,
      cleanup: () => {
        host.remove()
      },
    }
  }

  function obterPaginasExportacao(container: HTMLElement): HTMLElement[] {
    const paginas = Array.from(container.querySelectorAll<HTMLElement>('.page-break'))
    if (paginas.length > 0) return paginas

    const primeiroElemento = container.firstElementChild as HTMLElement | null
    return primeiroElemento ? [primeiroElemento] : [container]
  }

  function desenharNumeroOrcamentoNoPdf(
    pagina: HTMLElement,
    pdf: jsPDF,
    ratio: number,
    offsetX: number,
    offsetY: number,
    domToCanvasScale: number
  ) {
    const marcadores = Array.from(pagina.querySelectorAll<HTMLElement>('[data-pdf-orcamento-numero]'))
    if (marcadores.length === 0) return

    const pageRect = pagina.getBoundingClientRect()

    marcadores.forEach((marcador) => {
      const texto = marcador.textContent?.trim()
      if (!texto) return

      const markerRect = marcador.getBoundingClientRect()
      const estilo = window.getComputedStyle(marcador)
      const fontPx = parseFloat(estilo.fontSize || '16')

      const xMm = offsetX + (markerRect.left - pageRect.left + 6) * domToCanvasScale * ratio
      const yMm = offsetY + (markerRect.top - pageRect.top + markerRect.height * 0.72) * domToCanvasScale * ratio

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(Math.max(9, fontPx * 0.75))
      pdf.setTextColor(255, 255, 255)
      pdf.text(texto, xMm, yMm)
    })
  }

  async function gerarPDFBlob(orcamento?: Orcamento): Promise<Blob | null> {
    const containerOriginal = await obterConteudoParaExportacao(orcamento)
    if (!containerOriginal) return null

    toast.info('Gerando PDF...')

    const { clone, cleanup } = criarCloneParaExportacao(containerOriginal)

    try {
      await aguardarConteudoEstavel(clone)

      const paginas = obterPaginasExportacao(clone)
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

      for (let index = 0; index < paginas.length; index++) {
        const pagina = paginas[index]

        const captureWidth = Math.max(
          794,
          Math.ceil(pagina.scrollWidth || 0),
          Math.ceil(pagina.getBoundingClientRect().width || 0)
        )

        const canvas = await html2canvas(pagina, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          width: captureWidth,
          height: pagina.scrollHeight,
          windowWidth: captureWidth,
          windowHeight: pagina.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 10000,
        })

        const domToCanvasScale = canvas.width / captureWidth
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
        const renderWidth = canvas.width * ratio
        const renderHeight = canvas.height * ratio
        const offsetX = (pageWidth - renderWidth) / 2
        const offsetY = (pageHeight - renderHeight) / 2
        const imgData = canvas.toDataURL('image/png')

        if (index > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST')
        desenharNumeroOrcamentoNoPdf(pagina, pdf, ratio, offsetX, offsetY, domToCanvasScale)
      }

      return pdf.output('blob')
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      toast.error('Erro ao gerar PDF')
      return null
    } finally {
      cleanup()
    }
  }

  async function baixarPDF(o: Orcamento) {
    const blob = await gerarPDFBlob(o)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Orcamento_${o.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF baixado com sucesso!')
    }
  }

  async function imprimirOrcamento(o?: Orcamento) {
    const containerOriginal = await obterConteudoParaExportacao(o)
    if (!containerOriginal) return

    const { clone, cleanup } = criarCloneParaExportacao(containerOriginal)
    await aguardarConteudoEstavel(clone)
    const conteudo = clone.innerHTML
    cleanup()

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      toast.error('Permita pop-ups para imprimir o orçamento')
      return
    }

    const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n')

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Orçamento</title>
          ${estilos}
          <style>
            @page { size: A4; margin: 0; }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff !important;
            }
            body {
              display: flex;
              justify-content: center;
            }
            #print-root {
              width: 210mm;
              max-width: 210mm;
              margin: 0 auto;
              background: #fff;
            }
            #print-root .page-break {
              width: 210mm !important;
              min-height: 297mm !important;
              break-after: page;
              page-break-after: always;
              overflow: hidden;
            }
            #print-root .page-break:last-child {
              break-after: auto;
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          <div id="print-root">${conteudo}</div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 350);
            });
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }


  function gerarMensagemPadrao(orcamento: Orcamento) {
    return `Prezado(a) ${orcamento.cliente_razao_social || orcamento.cliente_nome},

Segue o orçamento ${orcamento.numero}.

DETALHES DO ORÇAMENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fornecedor: ${orcamento.fornecedor_nome || orcamento.operacao || '-'}
Valor Total: ${formatCurrency(orcamento.total)}
Prazo de Entrega: ${orcamento.prazo_entrega || '-'}
Validade: ${orcamento.data_validade ? formatDate(orcamento.data_validade) : '-'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estamos à disposição para quaisquer esclarecimentos e negociações.

Atenciosamente,

Equipe Comercial
3W Hotelaria - Hospitalidade com Excelência
www.3whotelaria.com.br
(11) 5197-5779`
  }

  function restaurarMensagemPadrao() {
    if (orcamentoEnviar) {
      setEmailMensagem(gerarMensagemPadrao(orcamentoEnviar))
      toast.info('Mensagem restaurada para o padrão')
    }
  }

  function enviarPorEmail(o: Orcamento) {
    setOrcamentoEnviar(o)
    const emails = [o.cliente_email, 'comercial1@3whotelaria.com.br']
      .filter(Boolean)
      .join(', ')
    setEmailDestinatarios(emails)
    setEmailAssunto(`Orçamento ${o.numero} - 3W Hotelaria`)
    setEmailMensagem(gerarMensagemPadrao(o))
    setModalEnviar(true)
  }

  function escapeHtml(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function formatMultilineText(value: unknown) {
    const text = String(value ?? '').trim()
    return text ? escapeHtml(text).replace(/\n/g, '<br />') : '—'
  }

  function getAbsoluteUrl(url?: string | null) {
    if (!url) return null
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/')) return `${window.location.origin}${url}`
    return `${window.location.origin}/${url.replace(/^\/+/, '')}`
  }

  // ========== EMAIL HTML HELPERS ==========
  const F = 'font-family:Arial,Helvetica,sans-serif;'
  const esc = escapeHtml
  const nl2br = (t: string) => t ? esc(t).replace(/\n/g, '<br/>') : '—'

  async function capturarHtmlOrcamento(): Promise<string | null> {
    if (!orcamentoEnviar) return null

    const { orcamento, itens } = await carregarOrcamentoCompleto(orcamentoEnviar)

    const fornecedorNome = (orcamento as any).fornecedor_nome_fantasia || orcamento.fornecedor_nome || orcamento.operacao || '3W Hotelaria'
    const tipoLayout = String((orcamento as any).fornecedor_tipo_layout || 'padrao')
    const fornecedorNomeNorm = fornecedorNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const layoutMidea = tipoLayout === 'midea' || ['MIDEA','SPRINGER','CLIMAZON','CARRIER'].some(k => fornecedorNomeNorm.includes(k))
    const isCastor = tipoLayout === 'castor'

    const subtotal = parseNum((orcamento as any).subtotal) || itens.reduce((a, i) => a + parseNum(i.total), 0)
    const impostosPerc = parseNum((orcamento as any).impostos_percentual)
    const impostos = parseNum((orcamento as any).impostos) || subtotal * (impostosPerc / 100)
    const descontoPerc = parseNum((orcamento as any).desconto_percentual)
    const descontoVal = parseNum((orcamento as any).desconto_valor) || parseNum((orcamento as any).desconto) || subtotal * (descontoPerc / 100)
    const frete = parseNum((orcamento as any).frete)
    const total = parseNum((orcamento as any).total) || subtotal + impostos - descontoVal + frete

    const logo3w = getAbsoluteUrl('/logo_3Whotelaria.jpeg')
    const logoFornecedor = getAbsoluteUrl((orcamento as any).fornecedor_logotipo_url || null)
    const marketingUrl = getAbsoluteUrl(resolverImagemMarketing(orcamento.imagem_marketing_url, (orcamento as any).fornecedor_imagem_template_url || null, layoutMidea))

    const condBase = extrairTextoCondicoesPagamento(orcamento.condicoes_pagamento)
    const condicoesPag = layoutMidea ? resolverCondicoesPagamentoMidea(condBase) : (condBase || 'ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\n- para 30/60/90/120/150 acréscimo de 3,80%\n- para 30/60/90/120/150/180 acréscimo de 4,20%\n- para 30/60/90/120/150/180/210 acréscimo de 4,80%\n- para 30/60/90/120/150/180/210/240 acréscimo de 5,20%\n- para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%\n- para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.')
    const termosForn = resolverTermosFornecedor(orcamento.termos_fornecedor, layoutMidea)
    const emailExib = user?.email || 'comercial1@3whotelaria.com.br'
    const whatsHref = 'https://wa.me/551151975779?text=' + encodeURIComponent(`Olá, gostaria de falar sobre o orçamento ${orcamento.numero}.`)
    const confirmHref = `mailto:${emailExib}?subject=${encodeURIComponent(`Confirmação do orçamento ${orcamento.numero}`)}`

    // Items table header columns
    const colHeaders = isCastor
      ? ['Item','Código','Descrição','Medidas','Qtd','Unitário','Total']
      : ['Item','Código','Descrição','Qtd','Unitário','Total']

    const itemRows = itens.map((item, idx) => {
      const cols = isCastor
        ? [
            String(idx + 1),
            esc(item.codigo || '—'),
            `<strong>${esc(item.descricao)}</strong>${item.especificacoes ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(item.especificacoes)}</span>` : ''}`,
            esc((item as any).medidas || '—'),
            String(item.quantidade),
            esc(formatCurrency(item.preco_unitario)),
            esc(formatCurrency(item.total)),
          ]
        : [
            String(idx + 1),
            esc(item.codigo || '—'),
            `<strong>${esc(item.descricao)}</strong>${item.especificacoes ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(item.especificacoes)}</span>` : ''}`,
            String(item.quantidade),
            esc(formatCurrency(item.preco_unitario)),
            esc(formatCurrency(item.total)),
          ]
      const bg = idx % 2 === 0 ? '#f9fafb' : '#ffffff'
      const aligns = isCastor
        ? ['center','center','left','center','center','right','right']
        : ['center','center','left','center','right','right']
      return `<tr>${cols.map((c, i) => `<td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:${aligns[i]};vertical-align:top;">${c}</td>`).join('')}</tr>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Orçamento ${esc(orcamento.numero)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;${F}">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:0;">

<!-- ============ PÁGINA 1 - CAPA ============ -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;">

  <!-- HEADER AZUL -->
  <tr><td style="background-color:#1a4168;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <!-- Esquerda: Logo + Contatos -->
        <td style="vertical-align:top;width:55%;">
          ${logo3w ? `<img src="${esc(logo3w)}" alt="3W Hotelaria" style="display:block;height:70px;width:auto;margin-bottom:12px;"/>` : ''}
          <table cellpadding="0" cellspacing="0" border="0" style="padding-left:8px;">
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>www.3whotelaria.com.br</td></tr>
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 9.81 19.79 19.79 0 0 1 .22 1.18 2 2 0 0 1 2.18 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.91 7.09a16 16 0 0 0 6 6l.56-.56a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92z"/></svg>+55 (11) 5197-5779</td></tr>
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${esc(emailExib)}</td></tr>
          </table>
        </td>
        <!-- Direita: Número + Datas + Status -->
        <td style="vertical-align:top;text-align:right;width:45%;">
          <div style="display:inline-block;padding:10px 20px;background-color:#c4942c;color:#ffffff;${F}font-size:18px;font-weight:700;border-radius:8px;margin-bottom:12px;">
            Orçamento ${esc(orcamento.numero)}
          </div>
          ${logoFornecedor ? `<div style="margin:12px 0;text-align:right;"><img src="${esc(logoFornecedor)}" alt="${esc(fornecedorNome)}" style="display:inline-block;height:48px;max-width:160px;"/></div>` : (orcamento.fornecedor_nome ? `<div style="margin:8px 0;${F}font-size:20px;font-weight:700;color:#ef4444;">${esc(orcamento.fornecedor_nome.split(' ')[0])}</div>` : '')}
          <div style="${F}font-size:13px;color:#ffffff;line-height:20px;">
            Emitido em ${esc(formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at))}<br/>
            <strong>Expira em ${esc(formatDate(orcamento.data_validade))}</strong>
          </div>
          <div style="display:inline-block;margin-top:10px;padding:5px 14px;background-color:#e5e7eb;color:#374151;${F}font-size:11px;font-weight:700;border-radius:4px;">
            ${esc(getStatusLabel(orcamento.status))}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- IMAGEM MARKETING -->
  ${marketingUrl ? `
  <tr><td style="padding:0;background-color:#f3f4f6;">
    <img src="${esc(marketingUrl)}" alt="Marketing" style="display:block;width:100%;height:auto;"/>
  </td></tr>` : `
  <tr><td style="padding:40px 24px;background:linear-gradient(135deg,#eff6ff,#f5f3ff,#fdf2f8);text-align:center;">
    <div style="${F}font-size:28px;font-weight:700;color:#1a4168;margin-bottom:8px;">${esc(orcamento.fornecedor_nome || orcamento.operacao || '')}</div>
    <div style="${F}font-size:18px;color:#6b7280;">é na 3W Hotelaria!</div>
  </td></tr>`}

  <!-- RODAPÉ DOURADO - DADOS DO CLIENTE -->
  <tr><td style="background-color:#c4942c;padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;width:60%;">
          <div style="${F}font-size:16px;font-weight:700;color:#1a4168;margin-bottom:8px;">
            ${esc(orcamento.cliente_cnpj || '')} &nbsp; ${esc(orcamento.cliente_nome || '')}
          </div>
          <div style="${F}font-size:13px;color:#000000;line-height:20px;">
            ✉️ ${esc(orcamento.cliente_email || '—')}<br/>
            📍 ${esc(orcamento.cliente_endereco || '—')}<br/>
            📞 ${esc(orcamento.cliente_telefone || '—')}
          </div>
        </td>
        <td style="vertical-align:top;text-align:right;width:40%;">
          <div style="${F}font-size:14px;font-weight:700;color:#1a4168;margin-bottom:8px;">Endereço de Entrega</div>
          <div style="${F}font-size:13px;color:#000000;">${esc(orcamento.cliente_endereco || '—')}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:12px;border-top:1px solid rgba(26,65,104,0.3);text-align:center;">
          <div style="${F}font-size:13px;color:#1a4168;">
            Segue abaixo o orçamento solicitado. Estamos à disposição para quaisquer esclarecimentos e alterações. <strong>Bons Negócios!</strong>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ============ PÁGINA 2 - ITENS E DETALHES ============ -->

  <!-- TABELA DE ITENS -->
  <tr><td style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        ${colHeaders.map(h => `<th style="padding:10px 8px;background-color:#1a4168;color:#ffffff;${F}font-size:12px;font-weight:700;border:1px solid #ffffff;text-align:center;">${h}</th>`).join('')}
      </tr>
      ${itemRows}
    </table>
  </td></tr>

  <!-- ATENÇÃO + RESUMO FINANCEIRO lado a lado -->
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <!-- BOX ATENÇÃO -->
        <td width="48%" style="vertical-align:top;padding-right:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;border:2px solid #d1d5db;border-radius:8px;">
            <tr><td style="padding:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                <tr>
                  <td style="width:36px;height:36px;background-color:#c4942c;border-radius:50%;text-align:center;vertical-align:middle;${F}font-size:20px;color:#ffffff;">⚠</td>
                  <td style="padding-left:10px;${F}font-size:16px;font-weight:700;color:#111827;">Atenção</td>
                </tr>
              </table>
              <div style="${F}font-size:12px;color:#374151;line-height:18px;">
                Antes de confirmar o pedido, recomendamos:<br/><br/>
                • Confira todos os itens do orçamento, em especial a descrição e quantidade.<br/>
                • Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.<br/>
                • Leia atentamente as observações do orçamento.<br/>
                • Veja os Termos Gerais da 3W Hotelaria.
              </div>
            </td></tr>
          </table>
        </td>
        <!-- RESUMO FINANCEIRO -->
        <td width="52%" style="vertical-align:top;padding-left:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;">
            <!-- Subtotal -->
            <tr><td style="padding:12px 16px;background-color:#c4942c;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="${F}font-size:14px;font-weight:700;color:#ffffff;">Subtotal</td>
                <td align="right" style="${F}font-size:18px;font-weight:700;color:#ffffff;">${esc(formatCurrency(subtotal))}</td>
              </tr></table>
            </td></tr>
            <!-- Impostos -->
            <tr><td style="padding:10px 16px;background-color:#ffffff;border-left:2px solid #d1d5db;border-right:2px solid #d1d5db;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="${F}font-size:13px;color:#374151;">Impostos</td>
                <td align="center" style="${F}font-size:13px;color:#374151;width:60px;">${impostosPerc.toFixed(2)}%</td>
                <td align="right" style="${F}font-size:13px;font-weight:600;color:#374151;width:100px;">${esc(formatCurrency(impostos))}</td>
              </tr></table>
            </td></tr>
            ${descontoVal > 0 ? `
            <!-- Desconto -->
            <tr><td style="padding:10px 16px;background-color:#ffffff;border-left:2px solid #d1d5db;border-right:2px solid #d1d5db;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="${F}font-size:13px;color:#374151;">Desconto</td>
                <td align="center" style="${F}font-size:13px;color:#374151;width:60px;">${descontoPerc.toFixed(2)}%</td>
                <td align="right" style="${F}font-size:13px;font-weight:600;color:#dc2626;width:100px;">-${esc(formatCurrency(descontoVal))}</td>
              </tr></table>
            </td></tr>` : ''}
            <!-- Total Final -->
            <tr><td style="padding:14px 16px;background-color:#1a4168;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="${F}font-size:14px;font-weight:700;color:#ffffff;">Valor Final</td>
                <td align="right" style="${F}font-size:22px;font-weight:700;color:#ffffff;">${esc(formatCurrency(total))}</td>
              </tr></table>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- FRETE / ENTREGA / DIFAL (esquerda) | CONDIÇÕES (direita) -->
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <!-- ESQUERDA: Frete + Entrega + Difal -->
        <td width="35%" style="vertical-align:top;padding-right:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;">
            <!-- Frete + Entrega lado a lado -->
            <tr>
              <td width="50%" style="border-right:1px solid #d1d5db;border-bottom:2px solid #d1d5db;">
                <div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;">
                  <strong style="${F}font-size:12px;color:#111827;">🚚 Frete</strong>
                </div>
                <div style="padding:10px;text-align:center;${F}font-size:12px;font-weight:600;color:#111827;">
                  ${esc(orcamento.frete_tipo || 'CIF (Incluso)')}
                </div>
              </td>
              <td width="50%" style="border-bottom:2px solid #d1d5db;">
                <div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;">
                  <strong style="${F}font-size:12px;color:#111827;">📦 Entrega</strong>
                </div>
                <div style="padding:10px;text-align:center;${F}font-size:12px;font-weight:600;color:#111827;">
                  ${esc(orcamento.prazo_entrega || '45/60 dias')}
                </div>
              </td>
            </tr>
            <!-- Difal -->
            <tr><td colspan="2">
              <div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;">
                <strong style="${F}font-size:12px;color:#111827;">💲 Difal</strong>
              </div>
              <div style="padding:10px;background-color:#eff6ff;${F}font-size:11px;color:#374151;line-height:16px;">
                ${nl2br(orcamento.difal_texto || 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.')}
              </div>
            </td></tr>
          </table>
        </td>
        <!-- DIREITA: Condições de Pagamento -->
        <td width="65%" style="vertical-align:top;padding-left:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;">
            <tr><td style="background-color:#f3f4f6;padding:10px;text-align:center;border-bottom:2px solid #d1d5db;">
              <strong style="${F}font-size:13px;color:#111827;">💳 Condições e Forma de Pagamento</strong>
            </td></tr>
            <tr><td style="padding:14px;${F}font-size:12px;line-height:18px;color:#374151;">
              ${layoutMidea ? `<div style="font-weight:600;margin-bottom:8px;">CONDIÇÕES DE PAGAMENTO:</div>` : ''}
              ${nl2br(condicoesPag)}
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- OBSERVAÇÕES GERAIS -->
  ${orcamento.observacoes_gerais ? `
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 16px;background-color:#f3f4f6;border-bottom:2px solid #d1d5db;${F}font-size:14px;font-weight:700;color:#111827;">Observações Gerais</td></tr>
      <tr><td style="padding:14px 16px;${F}font-size:13px;line-height:20px;color:#374151;">${nl2br(orcamento.observacoes_gerais)}</td></tr>
    </table>
  </td></tr>` : ''}

  <!-- TERMOS DO FABRICANTE -->
  ${termosForn ? `
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #1a4168;border-radius:8px;background-color:#eff6ff;overflow:hidden;">
      <tr><td style="padding:14px 16px;border-bottom:2px solid #1a4168;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          ${logoFornecedor ? `<td style="padding-right:12px;"><img src="${esc(logoFornecedor)}" alt="" style="height:40px;width:auto;"/></td>` : ''}
          <td style="${F}font-size:16px;font-weight:700;color:#1a4168;">${layoutMidea ? 'Termos Legais Midea Carrier' : 'Termos do Fabricante'}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 16px;${F}font-size:12px;line-height:19px;color:#1f2937;">${nl2br(termosForn)}</td></tr>
    </table>
  </td></tr>` : ''}

  <!-- TERMOS LEGAIS 3W -->
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;background-color:#f9fafb;overflow:hidden;">
      <tr><td style="padding:14px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
          <td style="background-color:#1a4168;padding:6px;border-radius:4px;"><img src="${esc(logo3w || '')}" alt="3W" style="height:24px;width:auto;display:block;"/></td>
          <td style="padding-left:10px;${F}font-size:14px;font-weight:700;color:#c4942c;">TERMOS LEGAIS DA 3W HOTELARIA</td>
        </tr></table>
        <div style="${F}font-size:11px;line-height:17px;color:#374151;">
          • O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.<br/>
          • Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.<br/>
          • As políticas comerciais variam conforme o Fabricante/Fornecedor.<br/>
          • As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição estadual do cliente, e estado da unidade/fábrica fornecedora.<br/>
          • Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.<br/>
          • Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da ${esc(fornecedorNome)}.
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- BOTÕES DE AÇÃO -->
  <tr><td style="padding:0 24px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="48%" align="center" style="padding-right:8px;">
          <a href="${esc(whatsHref)}" target="_blank" style="display:block;background-color:#16a34a;color:#ffffff;${F}font-size:14px;font-weight:700;text-decoration:none;padding:14px 10px;border-radius:8px;text-align:center;">
            📞 Falar com o Vendedor
          </a>
        </td>
        <td width="48%" align="center" style="padding-left:8px;">
          <a href="${esc(confirmHref)}" target="_blank" style="display:block;background-color:#c4942c;color:#ffffff;${F}font-size:14px;font-weight:700;text-decoration:none;padding:14px 10px;border-radius:8px;text-align:center;">
            📦 Confirmar Pedido
          </a>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  }

  async function enviarEmailProfissional() {
    if (!orcamentoEnviar) return
    setEnviandoEmail(true)
    try {
      // 1. Buscar configuração de email do usuário
      const { data: { user } } = await cloudSupabase.auth.getUser()

      const { data: configEmail, error: errorConfig } = await cloudSupabase
        .from('usuarios_email_config' as any)
        .select('*')
        .eq('user_id', user?.id)
        .eq('ativo', true)
        .single()

      if (!configEmail || errorConfig) {
        toast.error('Configure suas credenciais de e-mail', {
          description: 'Acesse Admin → Config. E-mail para configurar',
          action: {
            label: 'Ir para Configurações',
            onClick: () => window.location.href = '/admin/email'
          }
        })
        return
      }

      const config = configEmail as any

      console.log('📧 Capturando HTML do orçamento e enviando email...')
      console.log('👤 Remetente SMTP (config):', config.email)
      console.log('📨 Destinatários:', emailDestinatarios)

      // 2. Capturar HTML completo do orçamento com estilos inline
      toast.info('Preparando orçamento para envio...')
      const htmlContent = await capturarHtmlOrcamento()
      if (!htmlContent) {
        toast.error('Não foi possível capturar o HTML do orçamento')
        return
      }

      // 3. Enviar via webhook n8n com HTML no corpo
      const response = await fetch(
        'https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar-email-orcamento',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html_content: htmlContent,
            orcamento_id: orcamentoEnviar.id,
            numero: orcamentoEnviar.numero,
            destinatarios: emailDestinatarios,
            assunto: emailAssunto,
            mensagem: emailMensagem,
            from_email: config.email,
          }),
        }
      )

      const resultado = await response.json()

      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || `Erro HTTP ${response.status}`)
      }

      // 4. Atualizar status do orçamento
      const { error } = await supabase
        .from('orcamentos')
        .update({
          status: 'enviado',
          enviado_em: new Date().toISOString()
        })
        .eq('id', orcamentoEnviar.id)
      if (error) throw error

      if (orcamentoEnviar.card_id) {
        await supabase
          .from('acoes_comerciais_log')
          .insert({
            card_id: orcamentoEnviar.card_id,
            acao: 'orcamento_enviado',
            descricao: `Orçamento ${orcamentoEnviar.numero} enviado para ${emailDestinatarios} via ${config.email}`
          })
      }

      toast.success('E-mail enviado com sucesso!', {
        description: `Enviado de ${config.email}`
      })
      setModalEnviar(false)
      buscarOrcamentos()
      buscarContadores()
    } catch (error: any) {
      console.error('❌ Erro ao enviar:', error)
      toast.error('Erro ao enviar e-mail', {
        description: error?.message || 'Tente novamente.'
      })
    } finally {
      setEnviandoEmail(false)
    }
  }
  function enviarPorWhatsApp(o: Orcamento) {
    const telefone = (o.cliente_telefone || '').replace(/\D/g, '')
    const mensagem = encodeURIComponent(
      `Olá ${o.cliente_nome}! 👋\n\n` +
      `Segue a *Proposta Comercial nº ${o.numero}* da *3W HOTELARIA*.\n\n` +
      `💰 *Valor Total:* R$ ${parseNum(o.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `📅 *Validade:* ${o.validade_dias} dias\n\n` +
      `Ficamos à disposição para esclarecimentos!\n\n` +
      `Equipe Comercial\n3W HOTELARIA\n📧 comercial1@3whotelaria.com.br\n📞 +55 11 5197-5779`
    )
    const url = telefone
      ? `https://wa.me/55${telefone}?text=${mensagem}`
      : `https://wa.me/?text=${mensagem}`
    window.open(url, '_blank')
    toast.success('WhatsApp aberto!')
  }


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
          <option value="G4">Gestão 4</option>
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
              <TableHead className="text-white">Fornecedor</TableHead>
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
                    <p className="text-sm">{orcamento.fornecedor_nome || orcamento.operacao || '-'}</p>
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
                  <TableCell><span className="text-sm text-muted-foreground">{formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => visualizarOrcamento(orcamento)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editarOrcamento(orcamento)}><Edit className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Send className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => enviarPorEmail(orcamento)}>
                            <Mail className="h-4 w-4 mr-2" /> Enviar por E-mail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => enviarPorWhatsApp(orcamento)}>
                            <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          <div className="bg-muted border-b p-4 flex items-center justify-between">
            <h3 className="font-bold text-lg">
              Orçamento {orcamentoVisualizar?.numero}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => imprimirOrcamento()}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              {orcamentoVisualizar && (
                <>
                  <Button variant="outline" size="sm" onClick={() => baixarPDF(orcamentoVisualizar)}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => enviarPorEmail(orcamentoVisualizar)}>
                        <Mail className="h-4 w-4 mr-2" /> Enviar por E-mail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enviarPorWhatsApp(orcamentoVisualizar)}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
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
                emailUsuario={user?.email}
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

      {/* MODAL ENVIAR EMAIL PROFISSIONAL */}
      <Dialog open={modalEnviar} onOpenChange={setModalEnviar}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar Orçamento por E-mail</DialogTitle>
            <DialogDescription>
              Orçamento {orcamentoEnviar?.numero} - {orcamentoEnviar?.cliente_nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Para (E-mails) *</Label>
              <Input
                type="email"
                value={emailDestinatarios}
                onChange={(e) => setEmailDestinatarios(e.target.value)}
                placeholder="cliente@email.com, gestor@3whotelaria.com.br"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe múltiplos e-mails com vírgula
              </p>
            </div>

            <div>
              <Label>Assunto *</Label>
              <Input
                value={emailAssunto}
                onChange={(e) => setEmailAssunto(e.target.value)}
                placeholder="Orçamento 3W Hotelaria"
              />
            </div>

            <div className="bg-accent/50 border border-accent rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Conteúdo do E-mail</p>
                  <p className="text-sm text-muted-foreground">
                    O orçamento completo será enviado diretamente no corpo do e-mail em HTML.
                  </p>
                </div>
              </div>
            </div>

            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-muted-foreground">
                👁️ Pré-visualizar resumo
              </summary>
              <div className="mt-4 bg-muted rounded p-4 text-sm space-y-2 border">
                <p><strong>Para:</strong> {emailDestinatarios}</p>
                <p><strong>Assunto:</strong> {emailAssunto}</p>
                <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  O orçamento será renderizado como HTML no corpo do e-mail.
                </p>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalEnviar(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarEmailProfissional}
              disabled={!emailDestinatarios || !emailAssunto || enviandoEmail}
            >
              {enviandoEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar E-mail
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
