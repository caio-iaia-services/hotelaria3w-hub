import { useState, useRef, useEffect, useCallback } from 'react'
import { useProdutosCastorBusca, ProdutoCastor, MedidaPreco } from '@/hooks/useProdutosCastor'
import { useTabelasCastor } from '@/hooks/useTabelasCastor'
import { calcularPrecoReal, regraPorLocal, REGRA_PADRAO } from '@/lib/castorPreco'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const MEDIDA_PADRAO: MedidaPreco = { medida: '88x198', preco: 1348.00 }

// Tabela = nº de referência da planilha do catálogo Castor (4 dígitos, ex.: 5140).
// Campo interno: não vai para o PDF/e-mail do cliente. A lista vem das tabelas importadas
// em Fornecedores > Castor > Orçamento (a mais recente é o padrão).

function parsePrice(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const raw = String(value).trim()
  if (!raw) return 0

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw

  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

interface ItemData {
  id: string
  tabela?: string
  codigo: string
  descricao: string
  medidas?: string
  especificacoes: string
  quantidade: number | string
  preco_unitario: number | string // Castor: preço unitário REAL (o que vai para o cliente)
  // Campos internos Castor (não vão para a proposta nem são salvos no orçamento)
  preco_referencia?: number | string
  desconto_pct?: number | string
  acrescimo_pct?: number | string
  total: number
}

interface Props {
  item: ItemData
  index: number
  canRemove: boolean
  tipoLayout?: string | null
  clienteUF?: string | null
  clienteCidade?: string | null
  onUpdate: (id: string, campo: string, valor: string | number) => void
  onRemove: (id: string) => void
}

// Campo de valor em R$ (mostra formatado; edita como texto)
function CampoMoeda({ label, value, onChange, interno = false }: {
  label: string
  value: string | number | null | undefined
  onChange: (texto: string) => void
  interno?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const num = parsePrice(value)
  return (
    <div>
      <Label>{label}{interno && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(interno)</span>}</Label>
      <Input
        placeholder="R$ 0,00"
        className={interno ? 'bg-muted/50' : undefined}
        value={editando ? texto : (num > 0 ? formatCurrency(num) : (value ? String(value) : ''))}
        onFocus={() => { setEditando(true); setTexto(num > 0 ? String(num).replace('.', ',') : String(value || '')) }}
        onChange={(e) => { setTexto(e.target.value); onChange(e.target.value) }}
        onBlur={() => setEditando(false)}
      />
    </div>
  )
}

const fmtPct = (n: number) => String(n).replace('.', ',')

export function OrcamentoItemRow({ item, index, canRemove, tipoLayout, clienteUF, clienteCidade, onUpdate, onRemove }: Props) {
  const [precoEditando, setPrecoEditando] = useState(false)
  const [precoTexto, setPrecoTexto] = useState('')
  const [codigoBusca, setCodigoBusca] = useState('')
  const [descricaoBusca, setDescricaoBusca] = useState('')
  const [showCodigoDropdown, setShowCodigoDropdown] = useState(false)
  const [showDescricaoDropdown, setShowDescricaoDropdown] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCastor | null>(null)
  const [medidas, setMedidas] = useState<MedidaPreco[]>([])

  const codigoRef = useRef<HTMLDivElement>(null)
  const descricaoRef = useRef<HTMLDivElement>(null)
  const medidasBackfillFeita = useRef(false)

  const isCastor = tipoLayout === 'castor'
  const { tabelas: TABELAS_CASTOR } = useTabelasCastor(isCastor)
  const TABELA_PADRAO = TABELAS_CASTOR[0]

  // Região do cliente → desconto/acréscimo (tabela de controle Castor de 07/10/2026)
  const regraRegiao = regraPorLocal(clienteUF, clienteCidade)
  const regra = regraRegiao ?? REGRA_PADRAO
  const descontoTexto = item.desconto_pct !== undefined && item.desconto_pct !== '' ? String(item.desconto_pct) : fmtPct(regra.desconto)
  const acrescimoTexto = item.acrescimo_pct !== undefined && item.acrescimo_pct !== '' ? String(item.acrescimo_pct) : fmtPct(regra.acrescimo)
  const regraAnterior = useRef(regra.tabela)
  const { resultados: resCodigo, loading: loadCodigo } = useProdutosCastorBusca(codigoBusca, 'codigo', isCastor)
  const { resultados: resDescricao, loading: loadDescricao } = useProdutosCastorBusca(descricaoBusca, 'descricao', isCastor)

  // Ao editar um orçamento existente, o item já vem com código/medida salvos mas
  // sem o produto selecionado (medidas fica vazio) — busca o produto pelo código
  // uma única vez pra repovoar a lista completa de medidas disponíveis no dropdown.
  useEffect(() => {
    if (medidasBackfillFeita.current) return
    if (!isCastor || !item.codigo || medidas.length > 0) return
    medidasBackfillFeita.current = true

    supabase
      .from('produtos_castor_view')
      .select('*')
      .eq('codigo', item.codigo)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return
        const produto = data as unknown as ProdutoCastor
        setMedidas(produto.medidas_precos || [])
        setProdutoSelecionado(produto)
      })
  }, [isCastor, item.codigo, medidas.length])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (codigoRef.current && !codigoRef.current.contains(e.target as Node)) setShowCodigoDropdown(false)
      if (descricaoRef.current && !descricaoRef.current.contains(e.target as Node)) setShowDescricaoDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selecionarProduto(produto: ProdutoCastor) {
    setProdutoSelecionado(produto)
    setMedidas(produto.medidas_precos || [])
    onUpdate(item.id, 'codigo', produto.codigo)
    onUpdate(item.id, 'descricao', produto.descricao)
    onUpdate(item.id, 'especificacoes', produto.especificacao || '')
    setShowCodigoDropdown(false)
    setShowDescricaoDropdown(false)
    setCodigoBusca('')
    setDescricaoBusca('')
  }

  function handleMedidaChange(value: string) {
    onUpdate(item.id, 'medidas', value)
    const found = [...medidas, MEDIDA_PADRAO].find(m => m.medida === value)
    if (found) {
      if (isCastor) {
        // preço da tabela vira a referência; desconto/acréscimo vêm da região do cliente
        onUpdate(item.id, 'preco_referencia', found.preco)
        aplicarRegra(found.preco)
      } else {
        onUpdate(item.id, 'preco_unitario', found.preco)
      }
    }
  }

  function aplicarRegra(referencia: number) {
    onUpdate(item.id, 'desconto_pct', fmtPct(regra.desconto))
    onUpdate(item.id, 'acrescimo_pct', fmtPct(regra.acrescimo))
    onUpdate(item.id, 'preco_unitario', calcularPrecoReal(referencia, regra.desconto, regra.acrescimo))
  }

  function mudouReferencia(texto: string) {
    onUpdate(item.id, 'preco_referencia', texto)
    const ref = parsePrice(texto)
    if (ref > 0) onUpdate(item.id, 'preco_unitario', calcularPrecoReal(ref, parsePrice(descontoTexto), parsePrice(acrescimoTexto)))
  }

  function mudouDesconto(texto: string) {
    onUpdate(item.id, 'desconto_pct', texto)
    const ref = parsePrice(item.preco_referencia)
    if (ref > 0) onUpdate(item.id, 'preco_unitario', calcularPrecoReal(ref, parsePrice(texto), parsePrice(acrescimoTexto)))
  }

  function mudouAcrescimo(texto: string) {
    onUpdate(item.id, 'acrescimo_pct', texto)
    const ref = parsePrice(item.preco_referencia)
    if (ref > 0) onUpdate(item.id, 'preco_unitario', calcularPrecoReal(ref, parsePrice(descontoTexto), parsePrice(texto)))
  }

  // Se o estado do cliente mudar com item já calculado, reaplica a regra da nova região
  useEffect(() => {
    if (regraAnterior.current === regra.tabela) return
    regraAnterior.current = regra.tabela
    const ref = parsePrice(item.preco_referencia)
    if (isCastor && ref > 0) aplicarRegra(ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regra.tabela])

  const precoNumerico = parsePrice(item.preco_unitario)

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-start justify-between mb-3">
        <p className="font-medium text-sm">Item {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className={`grid gap-3 ${tipoLayout === 'castor' ? 'grid-cols-12' : 'grid-cols-10'}`}>
        {/* TABELA (nº de referência da planilha do catálogo Castor) - apenas Castor */}
        {tipoLayout === 'castor' && (
          <div className="col-span-2">
            <Label>Tabela</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={item.tabela || TABELA_PADRAO}
              onChange={(e) => onUpdate(item.id, 'tabela', e.target.value)}
            >
              {TABELAS_CASTOR.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* CÓDIGO com autocomplete */}
        <div className="col-span-2 relative" ref={codigoRef}>
          <Label>Código</Label>
          <Input
            placeholder="Ex: MRC06B2"
            value={item.codigo}
            onChange={(e) => {
              onUpdate(item.id, 'codigo', e.target.value)
              setCodigoBusca(e.target.value)
              setShowCodigoDropdown(true)
            }}
            onFocus={() => { if (codigoBusca.length >= 2) setShowCodigoDropdown(true) }}
          />
          {showCodigoDropdown && resCodigo.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {resCodigo.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground truncate"
                  onClick={() => selecionarProduto(p)}
                >
                  <span className="font-medium">{p.codigo}</span> — {p.descricao}
                </button>
              ))}
            </div>
          )}
          {showCodigoDropdown && loadCodigo && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 text-xs text-muted-foreground">
              Buscando...
            </div>
          )}
        </div>

        {/* DESCRIÇÃO com autocomplete */}
        <div className={tipoLayout === 'castor' ? 'col-span-4 relative' : 'col-span-5 relative'} ref={descricaoRef}>
          <Label>Descrição *</Label>
          <Input
            placeholder="Descrição do produto"
            value={item.descricao}
            onChange={(e) => {
              onUpdate(item.id, 'descricao', e.target.value)
              setDescricaoBusca(e.target.value)
              setShowDescricaoDropdown(true)
            }}
            onFocus={() => { if (descricaoBusca.length >= 2) setShowDescricaoDropdown(true) }}
          />
          {showDescricaoDropdown && resDescricao.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {resDescricao.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selecionarProduto(p)}
                >
                  <span className="font-medium">{p.codigo}</span> — {p.descricao}
                  {p.especificacao && <span className="text-muted-foreground ml-1">({p.especificacao})</span>}
                </button>
              ))}
            </div>
          )}
          {showDescricaoDropdown && loadDescricao && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 text-xs text-muted-foreground">
              Buscando...
            </div>
          )}
        </div>

        {/* MEDIDAS dropdown - apenas Castor */}
        {tipoLayout === 'castor' && (
          <div className="col-span-3">
            <Label>Medidas</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={item.medidas || ''}
              onChange={(e) => handleMedidaChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {medidas.map(m => (
                <option key={m.medida} value={m.medida}>
                  {m.medida}
                </option>
              ))}
              {!medidas.some(m => m.medida === MEDIDA_PADRAO.medida) && (
                <option value={MEDIDA_PADRAO.medida}>{MEDIDA_PADRAO.medida}</option>
              )}
            </select>
          </div>
        )}

        {/* QUANTIDADE */}
        <div className="col-span-1">
          <Label>Qtd *</Label>
          <Input
            placeholder="1"
            value={item.quantidade || ''}
            onChange={(e) => onUpdate(item.id, 'quantidade', e.target.value)}
          />
        </div>

        {/* PREÇO UNITÁRIO */}
        {isCastor ? (
          <>
            <div className="col-span-3">
              <CampoMoeda label="Preço unitário referência" interno value={item.preco_referencia} onChange={mudouReferencia} />
            </div>
            <div className="col-span-3">
              <Label>Descontos (%)<span className="ml-1 text-[10px] font-normal text-muted-foreground">(interno)</span></Label>
              <Input className="bg-muted/50" placeholder="0" value={descontoTexto} onChange={(e) => mudouDesconto(e.target.value)} />
            </div>
            <div className="col-span-3">
              <Label>Acréscimos (%)<span className="ml-1 text-[10px] font-normal text-muted-foreground">(interno)</span></Label>
              <Input className="bg-muted/50" placeholder="0" value={acrescimoTexto} onChange={(e) => mudouAcrescimo(e.target.value)} />
            </div>
            <div className="col-span-3">
              <CampoMoeda label="Preço unitário real *" value={item.preco_unitario} onChange={(t) => onUpdate(item.id, 'preco_unitario', t)} />
            </div>
            <p className="col-span-12 text-xs text-muted-foreground -mt-1">
              {regraRegiao
                ? <>Região do cliente: <b>{regraRegiao.regiao}</b> (tabela {regraRegiao.tabela}) — desconto {fmtPct(regraRegiao.desconto)}% · acréscimo {fmtPct(regraRegiao.acrescimo)}%.</>
                : <>Estado do cliente não identificado — usando a tabela padrão (sem ajuste).</>}
              {' '}Referência, descontos e acréscimos são internos; só o preço unitário real vai para o orçamento.
            </p>
          </>
        ) : (
        <div className="col-span-2">
          <Label>Preço Unitário *</Label>
          <Input
            placeholder="R$ 0,00"
            value={precoEditando ? precoTexto : (precoNumerico > 0 ? formatCurrency(precoNumerico) : (item.preco_unitario || ''))}
            onFocus={() => {
              setPrecoEditando(true)
              const val = precoNumerico > 0
                ? String(precoNumerico).replace('.', ',')
                : String(item.preco_unitario || '')
              setPrecoTexto(val)
            }}
            onChange={(e) => {
              setPrecoTexto(e.target.value)
              onUpdate(item.id, 'preco_unitario', e.target.value)
            }}
            onBlur={() => setPrecoEditando(false)}
          />
        </div>
        )}

        {/* ESPECIFICAÇÕES */}
        <div className={tipoLayout === 'castor' ? 'col-span-12' : 'col-span-10'}>
          <Label>Especificações</Label>
          <Textarea
            placeholder="Detalhes técnicos, cor, tamanho, etc."
            value={item.especificacoes}
            onChange={(e) => onUpdate(item.id, 'especificacoes', e.target.value)}
            rows={2}
          />
        </div>

        <div className={`${tipoLayout === 'castor' ? 'col-span-12' : 'col-span-10'} flex justify-end`}>
          <p className="text-sm font-medium">Total: {formatCurrency(item.total)}</p>
        </div>
      </div>
    </div>
  )
}
