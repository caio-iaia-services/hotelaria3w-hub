import { Orcamento, OrcamentoItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { supabase as supabaseCloud } from '@/integrations/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ItemLocal {
  id: string
  codigo: string
  descricao: string
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

export function EditarOrcamentoModal({ open, onOpenChange, orcamentoId, onSaved }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [itens, setItens] = useState<ItemLocal[]>([])
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
      setOrcamento(o as Orcamento)
      setDados({
        prazo_entrega: o.prazo_entrega || '',
        validade_dias: o.validade_dias || 30,
        frete: parseNum(o.frete),
        frete_tipo: o.frete_tipo || 'CIF (Incluso)',
        impostos_percentual: parseNum(o.impostos_percentual),
        desconto_percentual: parseNum(o.desconto_percentual),
        condicoes_pagamento: typeof o.condicoes_pagamento === 'object'
          ? (o.condicoes_pagamento?.texto || JSON.stringify(o.condicoes_pagamento))
          : (o.condicoes_pagamento || ''),
        observacoes: o.observacoes || '',
        observacoes_gerais: o.observacoes_gerais || '',
        difal_texto: o.difal_texto || '',
      })
      setImagemPreview(o.imagem_marketing_url || null)
      setImagemFile(null)
      setImagensAdicionaisPreview([])
      setImagensAdicionaisFiles([])
    }

    if (itensDb) {
      setItens((itensDb as any[]).map(i => ({
        id: i.id,
        codigo: i.codigo || '',
        descricao: i.descricao || '',
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
        const { error: upErr } = await supabase.storage.from('orcamentos').upload(path, imagemFile, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('orcamentos').getPublicUrl(path)
          imagemMarketingUrl = urlData.publicUrl
        }
      }

      // Update orcamento record
      const dataValidade = new Date()
      dataValidade.setDate(dataValidade.getDate() + (dados.validade_dias || 30))

      const { error: errOrc } = await supabase
        .from('orcamentos')
        .update({
          prazo_entrega: dados.prazo_entrega,
          validade_dias: dados.validade_dias,
          data_validade: dataValidade.toISOString(),
          frete: parseNum(dados.frete),
          frete_tipo: dados.frete_tipo,
          impostos_percentual: parseNum(dados.impostos_percentual),
          impostos: valorImpostos,
          desconto_percentual: parseNum(dados.desconto_percentual),
          desconto: valorDesconto,
          desconto_valor: valorDesconto,
          subtotal,
          total,
          condicoes_pagamento: JSON.stringify({ texto: dados.condicoes_pagamento }),
          observacoes: dados.observacoes,
          observacoes_gerais: dados.observacoes_gerais,
          difal_texto: dados.difal_texto,
          imagem_marketing_url: imagemMarketingUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orcamento.id)

      if (errOrc) throw errOrc

      // Delete existing items and re-insert all
      await supabase.from('orcamento_itens').delete().eq('orcamento_id', orcamento.id)

      const itensParaInserir = itens
        .filter(i => i.descricao.trim())
        .map((item, index) => ({
          orcamento_id: orcamento.id,
          codigo: item.codigo || null,
          descricao: item.descricao,
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
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err)
      toast.error('Erro ao salvar orçamento')
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
            {orcamento?.cliente_nome} — {orcamento?.operacao || orcamento?.fornecedor_nome || ''}
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
                  <p className="text-muted-foreground">Operação</p>
                  <p className="font-medium">{orcamento?.operacao || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{orcamento?.fornecedor_nome || '-'}</p>
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
                  <div key={item.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-medium text-sm">Item {index + 1}</p>
                      {itens.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-2">
                        <Label>Código</Label>
                        <Input value={item.codigo} onChange={(e) => atualizarItem(item.id, 'codigo', e.target.value)} />
                      </div>
                      <div className="col-span-5">
                        <Label>Descrição *</Label>
                        <Input value={item.descricao} onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantidade *</Label>
                        <Input value={item.quantidade || ''} onChange={(e) => atualizarItem(item.id, 'quantidade', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Label>Preço Unitário *</Label>
                        <Input value={item.preco_unitario || ''} onChange={(e) => atualizarItem(item.id, 'preco_unitario', e.target.value)} />
                      </div>
                      <div className="col-span-12">
                        <Label>Especificações</Label>
                        <Textarea
                          value={item.especificacoes}
                          onChange={(e) => atualizarItem(item.id, 'especificacoes', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="col-span-12 flex justify-end">
                        <p className="text-sm font-medium">Total: {formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  </div>
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
                  <span className="text-amber-700">
                    Impostos {dados.impostos_percentual > 0 && `(${dados.impostos_percentual}%)`}:
                  </span>
                  <span className="font-semibold text-amber-700">+{formatCurrency(valorImpostos)}</span>
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
