import { Orcamento, OrcamentoItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { supabase as supabaseCloud } from '@/integrations/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { getSaoPauloDateISOString } from '@/lib/date'
import { extrairTextoCondicoesPagamento, montarCondicoesPagamentoPayload } from '@/lib/condicoesPagamento'
import { resolverCondicoesPagamentoMidea } from '@/lib/fornecedorTerms'
import { Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OrcamentoItemRow } from '@/components/orcamentos/OrcamentoItemRow'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ItemLocal {
  id: string
  codigo: string
  descricao: string
  medidas?: string
  especificacoes: string
  quantidade: number | string
  preco_unitario: number | string
  total: number
  isNew?: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orcamentoId: string | null
  onSaved: () => void
}

interface ClienteAtual {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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

function isNomeMidea(nome: string | null | undefined) {
  const normalizado = String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()

  return (
    normalizado.includes('MIDEA') ||
    normalizado.includes('SPRINGER') ||
    normalizado.includes('CLIMAZON') ||
    normalizado.includes('CARRIER')
  )
}

export function EditarOrcamentoModal({ open, onOpenChange, orcamentoId, onSaved }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [itens, setItens] = useState<ItemLocal[]>([])
  const [tipoLayout, setTipoLayout] = useState<string | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagensAdicionaisPreview, setImagensAdicionaisPreview] = useState<string[]>([])
  const [imagensAdicionaisFiles, setImagensAdicionaisFiles] = useState<File[]>([])
  const [dados, setDados] = useState({
    prazo_entrega: '',
    validade_dias: 30,
    frete: 0,
    frete_tipo: 'CIF (Incluso)',
    impostos_percentual: 0,
    desconto_percentual: 0,
    condicoes_pagamento: '',
    observacoes: '',
    observacoes_gerais: '',
    difal_texto: '',
  })

  const carregarDados = useCallback(async () => {
    if (!orcamentoId) return
    setLoading(true)

    const [{ data: orc }, { data: itensDb }] = await Promise.all([
      supabase.from('orcamentos').select('*').eq('id', orcamentoId).maybeSingle(),
      supabase.from('orcamento_itens').select('*').eq('orcamento_id', orcamentoId).order('ordem'),
    ])

    if (orc) {
      const o = orc as any
      const [{ data: clienteAtual }, { data: forn }] = await Promise.all([
        o.cliente_id
          ? supabase
              .from('clientes')
              .select('nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
              .eq('id', o.cliente_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        o.fornecedor_id
          ? supabase.from('fornecedores').select('tipo_layout').eq('id', o.fornecedor_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setOrcamento(aplicarDadosClienteNoOrcamento(o as Orcamento, (clienteAtual as ClienteAtual | null) ?? null))
      setDados({
        prazo_entrega: o.prazo_entrega || '',
        validade_dias: o.validade_dias || 30,
        frete: parseNum(o.frete),
        frete_tipo: o.frete_tipo || 'CIF (Incluso)',
        impostos_percentual: parseNum(o.impostos_percentual),
        desconto_percentual: parseNum(o.desconto_percentual),
        condicoes_pagamento: isNomeMidea(o.fornecedor_nome || o.operacao)
          ? resolverCondicoesPagamentoMidea(extrairTextoCondicoesPagamento(o.condicoes_pagamento))
          : extrairTextoCondicoesPagamento(o.condicoes_pagamento),
        observacoes: o.observacoes || '',
        observacoes_gerais: o.observacoes_gerais || '',
        difal_texto: o.difal_texto || '',
      })
      setImagemPreview(o.imagem_marketing_url || null)
      setImagemFile(null)
      setImagensAdicionaisPreview([])
      setImagensAdicionaisFiles([])
      setTipoLayout((forn as any)?.tipo_layout || null)
    }

    if (itensDb) {
      setItens((itensDb as any[]).map(i => ({
        id: i.id,
        codigo: i.codigo || '',
        descricao: i.descricao || '',
        medidas: i.medidas || '',
        especificacoes: i.especificacoes || '',
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        total: parseNum(i.total),
      })))
    }

    setLoading(false)
  }, [orcamentoId])

  useEffect(() => {
    if (open && orcamentoId) carregarDados()
  }, [open, orcamentoId, carregarDados])

  function atualizarItem(id: string, campo: string, valor: string | number) {
    setItens(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [campo]: valor }
      const qty = parseNum(updated.quantidade)
      const price = parseNum(updated.preco_unitario)
      updated.total = qty * price
      return updated
    }))
  }

  function adicionarItem() {
    setItens(prev => [...prev, {
      id: `new-${Date.now()}`,
      codigo: '',
      descricao: '',
      medidas: '',
      especificacoes: '',
      quantidade: 1,
      preco_unitario: 0,
      total: 0,
      isNew: true,
    }])
  }

  function removerItem(id: string) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function handleImagemMarketing(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImagemFile(file)
      setImagemPreview(URL.createObjectURL(file))
    }
  }

  function removerImagemMarketing() {
    setImagemFile(null)
    setImagemPreview(null)
  }

  function handleImagensAdicionais(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setImagensAdicionaisFiles(prev => [...prev, ...files])
      setImagensAdicionaisPreview(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    }
  }

  function removerImagemAdicional(index: number) {
    setImagensAdicionaisFiles(prev => prev.filter((_, i) => i !== index))
    setImagensAdicionaisPreview(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = itens.reduce((sum, i) => sum + i.total, 0)
  const valorImpostos = subtotal * (parseNum(dados.impostos_percentual) / 100)
  const valorDesconto = subtotal * (parseNum(dados.desconto_percentual) / 100)
  const total = subtotal + valorImpostos - valorDesconto + parseNum(dados.frete)

  async function salvar() {
    if (!orcamento) return
    setSaving(true)

    try {
      // Validate
      const itensInvalidos = itens.filter(i => {
        const qty = parseNum(i.quantidade)
        const price = parseNum(i.preco_unitario)
        return !i.descricao.trim() || qty < 1 || price <= 0
      })
      if (itensInvalidos.length > 0) {
        toast.error('Preencha todos os campos obrigatórios dos itens')
        setSaving(false)
        return
      }

      // Upload imagem de marketing se alterada
      let imagemMarketingUrl = imagemPreview
      if (imagemFile) {
        const ext = imagemFile.name.split('.').pop()
        const path = `orcamentos/${orcamento.id}/marketing.${ext}`
        const { error: upErr } = await supabaseCloud.storage.from('orcamentos-marketing').upload(path, imagemFile, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabaseCloud.storage.from('orcamentos-marketing').getPublicUrl(path)
          imagemMarketingUrl = urlData.publicUrl
        } else {
          console.warn('Erro upload imagem:', upErr)
        }
      }

      // Update orcamento record
      const dataValidadeIso = getSaoPauloDateISOString(dados.validade_dias || 30)

      const condicoesPagamento = montarCondicoesPagamentoPayload(dados.condicoes_pagamento)
      const { data: clienteAtual } = orcamento.cliente_id
        ? await supabase
            .from('clientes')
            .select('nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
            .eq('id', orcamento.cliente_id)
            .maybeSingle()
        : { data: null }

      const clienteEnderecoAtual = montarEnderecoCliente((clienteAtual as ClienteAtual | null) ?? null)

      const updatePayload: Record<string, unknown> = {
        prazo_entrega: dados.prazo_entrega,
        validade_dias: dados.validade_dias,
        data_validade: dataValidadeIso,
        frete: parseNum(dados.frete),
        frete_tipo: dados.frete_tipo,
        impostos_percentual: parseNum(dados.impostos_percentual),
        impostos: valorImpostos,
        desconto_percentual: parseNum(dados.desconto_percentual),
        desconto: valorDesconto,
        desconto_valor: valorDesconto,
        subtotal,
        total,
        condicoes_pagamento: condicoesPagamento,
        observacoes: dados.observacoes,
        observacoes_gerais: dados.observacoes_gerais,
        difal_texto: dados.difal_texto,
        imagem_marketing_url: imagemMarketingUrl,
        cliente_nome: (clienteAtual as ClienteAtual | null)?.nome_fantasia || orcamento.cliente_nome,
        cliente_razao_social: (clienteAtual as ClienteAtual | null)?.razao_social || orcamento.cliente_razao_social,
        cliente_cnpj: (clienteAtual as ClienteAtual | null)?.cnpj || orcamento.cliente_cnpj,
        cliente_endereco: clienteEnderecoAtual || orcamento.cliente_endereco,
        cliente_email: (clienteAtual as ClienteAtual | null)?.email || orcamento.cliente_email,
        cliente_telefone: (clienteAtual as ClienteAtual | null)?.telefone || orcamento.cliente_telefone,
        updated_at: new Date().toISOString(),
      }

      // Fallback: remove campos que não existem no schema cache
      for (let tentativa = 0; tentativa < 20; tentativa++) {
        const { error: errOrc } = await supabase
          .from('orcamentos')
          .update(updatePayload as any)
          .eq('id', orcamento.id)

        if (!errOrc) break

        const colunaAusente = errOrc.code === 'PGRST204'
          ? errOrc.message.match(/Could not find the '([^']+)' column/)?.[1]
          : null

        if (colunaAusente && colunaAusente in updatePayload) {
          console.warn(`⚠️ Removendo campo ausente no schema: ${colunaAusente}`)
          delete updatePayload[colunaAusente]
          continue
        }

        throw errOrc
      }

      // Delete existing items and re-insert all
      await supabase.from('orcamento_itens').delete().eq('orcamento_id', orcamento.id)

      const itensParaInserir = itens
        .filter(i => i.descricao.trim())
        .map((item, index) => ({
          orcamento_id: orcamento.id,
          codigo: item.codigo || null,
          descricao: item.descricao,
          medidas: item.medidas || null,
          especificacoes: item.especificacoes || null,
          quantidade: parseNum(item.quantidade),
          preco_unitario: parseNum(item.preco_unitario),
          total: item.total,
          ordem: index,
        }))

      if (itensParaInserir.length > 0) {
        const { error: errItens } = await supabase.from('orcamento_itens').insert(itensParaInserir)
        if (errItens) throw errItens
      }

      toast.success('Orçamento atualizado com sucesso!')
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err)
      console.error('Detalhes:', JSON.stringify(err, null, 2))
      toast.error(`Erro ao salvar orçamento: ${err?.message || err?.details || 'erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orçamento {orcamento?.numero}</DialogTitle>
          <DialogDescription>
            {orcamento?.cliente_nome} — {orcamento?.fornecedor_nome || orcamento?.operacao || ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {/* INFO CLIENTE (readonly) */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{orcamento?.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{orcamento?.cliente_cnpj}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{orcamento?.fornecedor_nome || orcamento?.operacao || '-'}</p>
                </div>
              </div>
            </div>

            {/* DADOS DO ORÇAMENTO */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prazo de Entrega</Label>
                <Input
                  value={dados.prazo_entrega}
                  onChange={(e) => setDados(p => ({ ...p, prazo_entrega: e.target.value }))}
                />
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  value={dados.validade_dias}
                  onChange={(e) => setDados(p => ({ ...p, validade_dias: parseInt(e.target.value) || 30 }))}
                />
              </div>
              <div>
                <Label>Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dados.frete || ''}
                  onChange={(e) => setDados(p => ({ ...p, frete: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Impostos (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dados.impostos_percentual || ''}
                  onChange={(e) => setDados(p => ({ ...p, impostos_percentual: Number(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Valor: {formatCurrency(valorImpostos)}</p>
              </div>
              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dados.desconto_percentual || ''}
                  onChange={(e) => setDados(p => ({ ...p, desconto_percentual: Number(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Valor: -{formatCurrency(valorDesconto)}</p>
              </div>
              <div>
                <Label>Tipo de Frete</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={dados.frete_tipo}
                  onChange={(e) => setDados(p => ({ ...p, frete_tipo: e.target.value }))}
                >
                  <option value="CIF (Incluso)">CIF (Incluso)</option>
                  <option value="FOB">FOB</option>
                  <option value="A calcular">A calcular</option>
                </select>
              </div>
            </div>

            {/* ITENS */}
            <div>
              <Label className="mb-3 block">Itens do Orçamento</Label>
              <div className="space-y-3">
                {itens.map((item, index) => (
                  <OrcamentoItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    canRemove={itens.length > 1}
                    tipoLayout={tipoLayout}
                    onUpdate={atualizarItem}
                    onRemove={removerItem}
                  />
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={adicionarItem}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Item
              </Button>
            </div>

            {/* CONDIÇÕES DE PAGAMENTO */}
            <div>
              <Label>Condições de Pagamento</Label>
              <Textarea
                value={dados.condicoes_pagamento}
                onChange={(e) => setDados(p => ({ ...p, condicoes_pagamento: e.target.value }))}
                rows={3}
              />
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={dados.observacoes}
                onChange={(e) => setDados(p => ({ ...p, observacoes: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Observações Gerais</Label>
              <Textarea
                value={dados.observacoes_gerais}
                onChange={(e) => setDados(p => ({ ...p, observacoes_gerais: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Texto DIFAL</Label>
              <Textarea
                value={dados.difal_texto}
                onChange={(e) => setDados(p => ({ ...p, difal_texto: e.target.value }))}
                rows={3}
              />
            </div>

            {/* IMAGEM DE MARKETING */}
            <div className="bg-card border-2 border-dashed border-primary/20 rounded-lg p-4">
              <Label className="mb-2 block">Imagem de Marketing</Label>
              <div className="relative">
                <img
                  src={imagemPreview || '/placeholder.svg'}
                  alt="Preview marketing"
                  className="w-full max-h-48 object-cover rounded-lg bg-muted"
                />
                {imagemPreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={removerImagemMarketing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <label className="mt-2 inline-flex cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    Alterar Imagem
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleImagemMarketing} />
              </label>
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
                <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-lg">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#c4942c]">
                    Impostos {dados.impostos_percentual > 0 && `(${dados.impostos_percentual}%)`}:
                  </span>
                  <span className="font-semibold text-[#c4942c]">+{formatCurrency(valorImpostos)}</span>
                </div>
                {dados.desconto_percentual > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Desconto ({dados.desconto_percentual}%):</span>
                    <span className="font-semibold text-green-700">-{formatCurrency(valorDesconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b-2 border-gray-400">
                  <span className="text-blue-700">Frete:</span>
                  <span className="font-semibold text-blue-700">+{formatCurrency(parseNum(dados.frete))}</span>
                </div>
                <div className="flex justify-between items-center pt-2 bg-[#1E4A7C] text-white rounded-lg p-4 -mx-2">
                  <span className="font-bold text-lg">VALOR TOTAL:</span>
                  <span className="font-bold text-3xl">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
