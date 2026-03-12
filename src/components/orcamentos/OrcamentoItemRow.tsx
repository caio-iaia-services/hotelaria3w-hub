import { useState, useRef, useEffect } from 'react'
import { useProdutosCastorBusca, ProdutoCastor, MedidaPreco } from '@/hooks/useProdutosCastor'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ItemData {
  id: string
  codigo: string
  descricao: string
  medidas?: string
  especificacoes: string
  quantidade: number | string
  preco_unitario: number | string
  total: number
}

interface Props {
  item: ItemData
  index: number
  canRemove: boolean
  onUpdate: (id: string, campo: string, valor: string | number) => void
  onRemove: (id: string) => void
}

export function OrcamentoItemRow({ item, index, canRemove, onUpdate, onRemove }: Props) {
  const [codigoBusca, setCodigoBusca] = useState('')
  const [descricaoBusca, setDescricaoBusca] = useState('')
  const [showCodigoDropdown, setShowCodigoDropdown] = useState(false)
  const [showDescricaoDropdown, setShowDescricaoDropdown] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCastor | null>(null)
  const [medidas, setMedidas] = useState<MedidaPreco[]>([])

  const codigoRef = useRef<HTMLDivElement>(null)
  const descricaoRef = useRef<HTMLDivElement>(null)

  const { resultados: resCodigo, loading: loadCodigo } = useProdutosCastorBusca(codigoBusca, 'codigo')
  const { resultados: resDescricao, loading: loadDescricao } = useProdutosCastorBusca(descricaoBusca, 'descricao')

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
    const found = medidas.find(m => m.medida === value)
    if (found) {
      onUpdate(item.id, 'preco_unitario', found.preco)
    }
  }

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
      <div className="grid grid-cols-12 gap-3">
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
        <div className="col-span-4 relative" ref={descricaoRef}>
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

        {/* MEDIDAS dropdown */}
        <div className="col-span-2">
          <Label>Medidas</Label>
          {medidas.length > 0 ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={item.medidas || ''}
              onChange={(e) => handleMedidaChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {medidas.map(m => (
                <option key={m.medida} value={m.medida}>
                  {m.medida} — {formatCurrency(m.preco)}
                </option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="Ex: Queen 158x198"
              value={item.medidas || ''}
              onChange={(e) => onUpdate(item.id, 'medidas', e.target.value)}
            />
          )}
        </div>

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
        <div className="col-span-3">
          <Label>Preço Unitário *</Label>
          <Input
            placeholder="0,00"
            value={item.preco_unitario || ''}
            onChange={(e) => onUpdate(item.id, 'preco_unitario', e.target.value)}
          />
        </div>

        {/* ESPECIFICAÇÕES */}
        <div className="col-span-12">
          <Label>Especificações</Label>
          <Textarea
            placeholder="Detalhes técnicos, cor, tamanho, etc."
            value={item.especificacoes}
            onChange={(e) => onUpdate(item.id, 'especificacoes', e.target.value)}
            rows={2}
          />
        </div>

        <div className="col-span-12 flex justify-end">
          <p className="text-sm font-medium">Total: {formatCurrency(item.total)}</p>
        </div>
      </div>
    </div>
  )
}
