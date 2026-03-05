import { Orcamento, OrcamentoItem } from '@/lib/types'
import { Mail, MapPin, Phone, Truck, Package, CreditCard, AlertCircle, DollarSign, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface FornecedorLayout {
  tipo_layout: string | null
  nome_fantasia: string
  logotipo_url: string | null
}

interface Props {
  orcamento: Orcamento
  itens: OrcamentoItem[]
}

export function OrcamentoTemplate({ orcamento, itens }: Props) {
  const [fornecedor, setFornecedor] = useState<FornecedorLayout | null>(null)

  useEffect(() => {
    let ativo = true
    setFornecedor(null)

    async function buscarFornecedor() {
      // 1) Buscar por ID direto (fonte mais confiável)
      if (orcamento.fornecedor_id) {
        const { data } = await supabase
          .from('fornecedores')
          .select('tipo_layout, nome_fantasia, logotipo_url')
          .eq('id', orcamento.fornecedor_id)
          .maybeSingle()

        if (data && ativo) {
          setFornecedor(data as FornecedorLayout)
          return
        }
      }

      // 2) Fallback estrito por nome (prioriza fornecedor_nome do orçamento)
      const nomeBusca = (orcamento.fornecedor_nome || orcamento.operacao || '').trim()
      if (!nomeBusca) return

      // tenta igualdade exata
      const { data: exato } = await supabase
        .from('fornecedores')
        .select('tipo_layout, nome_fantasia, logotipo_url')
        .eq('nome_fantasia', nomeBusca)
        .maybeSingle()

      if (exato && ativo) {
        setFornecedor(exato as FornecedorLayout)
        return
      }

      // tenta case-insensitive, ainda com match exato (sem %)
      const { data: candidatos } = await supabase
        .from('fornecedores')
        .select('tipo_layout, nome_fantasia, logotipo_url')
        .ilike('nome_fantasia', nomeBusca)
        .limit(10)

      const encontrado = (candidatos || []).find((f: any) =>
        String(f.nome_fantasia || '').trim().toUpperCase() === nomeBusca.toUpperCase()
      )

      if (encontrado && ativo) {
        setFornecedor(encontrado as FornecedorLayout)
      }
    }

    buscarFornecedor()
    return () => {
      ativo = false
    }
  }, [orcamento.id, orcamento.fornecedor_id, orcamento.fornecedor_nome, orcamento.operacao])

  const tipoLayout = fornecedor?.tipo_layout || 'padrao'
  console.log('📊 === VALORES DO ORÇAMENTO NO TEMPLATE ===')
  console.log('📊 numero:', orcamento.numero)
  console.log('📊 subtotal:', orcamento.subtotal, '| tipo:', typeof orcamento.subtotal)
  console.log('📊 impostos:', orcamento.impostos, '| tipo:', typeof orcamento.impostos)
  console.log('📊 impostos_percentual:', orcamento.impostos_percentual)
  console.log('📊 desconto:', orcamento.desconto, '| tipo:', typeof orcamento.desconto)
  console.log('📊 desconto_valor:', orcamento.desconto_valor)
  console.log('📊 total:', orcamento.total, '| tipo:', typeof orcamento.total)
  console.log('📊 frete:', orcamento.frete, '| tipo:', typeof orcamento.frete)
  console.log('📊 fornecedor_id:', orcamento.fornecedor_id)
  console.log('📊 itens_count:', itens.length)
  itens.forEach((i, idx) => console.log(`📊 Item ${idx+1}: qty=${i.quantidade} price=${i.preco_unitario} total=${i.total}`))
  console.log('📊 TODAS AS KEYS:', Object.keys(orcamento).join(', '))
  console.log('📊 JSON COMPLETO:', JSON.stringify(orcamento))
  const toNumber = (value: unknown) => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0

    const raw = String(value).trim()
    const normalizado = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw
    const parsed = parseFloat(normalizado)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const formatCurrency = (value: unknown) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(toNumber(value))
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const dividirCodigo = (codigo: string) => {
    if (!codigo) return []
    return codigo.split('').filter(c => c.trim())
  }

  const subtotalDireto = toNumber((orcamento as any).subtotal)
  const subtotalAlt = toNumber((orcamento as any).valor_produtos)
  const subtotalItens = itens.reduce((sum, item) => sum + toNumber(item.total), 0)
  const subtotalCalculado = subtotalDireto > 0
    ? subtotalDireto
    : (subtotalAlt > 0 ? subtotalAlt : subtotalItens)

  const impostosPercentualCalculado = toNumber((orcamento as any).impostos_percentual)
  const impostosDireto = toNumber((orcamento as any).impostos)
  const impostosCalculado = impostosDireto > 0
    ? impostosDireto
    : subtotalCalculado * (impostosPercentualCalculado / 100)

  const descontoPercentualCalculado = toNumber((orcamento as any).desconto_percentual || (orcamento as any).percentual_desconto)
  const descontoDiretoValor = toNumber((orcamento as any).desconto_valor)
  const descontoDireto = toNumber((orcamento as any).desconto || (orcamento as any).valor_desconto)
  const descontoValorCalculado = descontoDiretoValor > 0
    ? descontoDiretoValor
    : (descontoDireto > 0 ? descontoDireto : subtotalCalculado * (descontoPercentualCalculado / 100))

  const freteDireto = toNumber((orcamento as any).frete)
  const freteAlt = toNumber((orcamento as any).valor_frete)
  const freteCalculado = freteDireto > 0 ? freteDireto : freteAlt

  const totalDireto = toNumber((orcamento as any).total)
  const totalAlt = toNumber((orcamento as any).valor_total)
  const totalPorFormula = subtotalCalculado + impostosCalculado - descontoValorCalculado + freteCalculado
  const totalCalculado = totalDireto > 0
    ? totalDireto
    : (totalAlt > 0 ? totalAlt : (totalPorFormula > 0 ? totalPorFormula : 0))

  console.log('📊 VALORES EFETIVOS USADOS:', {
    subtotalCalculado,
    impostosPercentualCalculado,
    impostosCalculado,
    descontoPercentualCalculado,
    descontoValorCalculado,
    freteCalculado,
    totalCalculado
  })

  return (
    <div className="bg-white font-sans">
      {/* ==================== PÁGINA 1 - CAPA ==================== */}
      <div className="min-h-screen flex flex-col page-break">
        
        {/* HEADER */}
        <div className="bg-[#1a4168] text-white p-6">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            
            {/* LADO ESQUERDO: Logo em cima, Contatos embaixo */}
            <div>
              <img 
                src="/logo_3Whotelaria.jpeg" 
                alt="3W Hotelaria" 
                className="h-24 mb-4"
              />
              
              <div className="flex flex-col gap-3 text-base ml-2">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">www.3whotelaria.com.br</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">+55 (11) 5197-5779</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">comercial1@3whotelaria.com.br</span>
                </div>
              </div>
            </div>
            
            {/* LADO DIREITO: Número + Datas + Status */}
            <div className="text-right">
              <div className="bg-[#D4AF37] text-[#1a4168] px-10 py-4 rounded-lg inline-block mb-4">
                <p className="text-xl font-bold">Orçamento {orcamento.numero}</p>
              </div>
              
              {fornecedor?.logotipo_url ? (
                <div className="mb-4 flex justify-end">
                  <img 
                    src={fornecedor.logotipo_url} 
                    alt={fornecedor.nome_fantasia} 
                    className="h-16 max-w-[200px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : orcamento.fornecedor_nome ? (
                <div className="mb-4">
                  <p className="text-2xl font-bold text-red-600">
                    {orcamento.fornecedor_nome.split(' ')[0]}
                  </p>
                </div>
              ) : null}
              
              <div className="space-y-1 text-sm">
                <p>Emitido em {formatDate(orcamento.data_emissao || orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
              
              <div className="mt-6 bg-gray-200 text-gray-700 px-4 py-1 rounded inline-block text-sm font-semibold">
                {orcamento.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        
        {/* HERO MARKETING */}
        {orcamento.imagem_marketing_url ? (
          <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 p-8">
            <div className="max-w-7xl mx-auto">
              <img 
                src={orcamento.imagem_marketing_url} 
                alt="Marketing" 
                className="w-full h-auto rounded-2xl shadow-2xl"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none'
                  if (target.parentElement) {
                    target.parentElement.innerHTML = '<div class="text-center py-20"><p class="text-4xl font-bold text-gray-400">Imagem de Marketing</p><p class="text-gray-500 mt-4">Adicione uma imagem na preparação do orçamento</p></div>'
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-12">
            <div className="text-center">
              <h2 className="text-5xl font-bold text-[#1a4168] mb-4">
                {orcamento.fornecedor_nome || orcamento.operacao}
              </h2>
              <p className="text-2xl text-gray-600">é na 3W Hotelaria!</p>
            </div>
          </div>
        )}
        
        {/* RODAPÉ - DADOS DO CLIENTE */}
        <div className="bg-[#D4AF37] p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              {/* Dados do Cliente - Esquerda */}
      <div className="space-y-1">
                <p className="font-bold text-xl text-[#1a4168] mb-3">
                  {orcamento.cliente_cnpj || '22.500.917/0001-98'}  {orcamento.cliente_nome || 'Mendes Plaza'}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{orcamento.cliente_email || 'mario.quinalha@marriott.com'}</span>
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{orcamento.cliente_endereco || 'Alameda Armenio Mendes, 70  Santos SP  CEP 11035-260'}</span>
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{orcamento.cliente_telefone || '(13) 99191-7669'}</span>
                </p>
              </div>
              
              {/* Endereço de Entrega - Direita */}
              <div className="text-right space-y-1">
                <p className="font-bold text-base text-[#1a4168] mb-3">Endereço de Entrega</p>
                <p className="text-sm">{orcamento.cliente_endereco || 'Alameda Armenio Mendes, 70  Santos SP  CEP 11035-260'}</p>
              </div>
            </div>
            
            <div className="text-center border-t border-[#1a4168]/30 pt-4">
              <p className="text-[#1a4168] text-sm">
                Segue abaixo o orçamento solicitado. Estamos a disposição para quaisquer esclarecimentos e alterações. <strong>Bons Negócios!</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PÁGINA 2 - ITENS E CÁLCULOS ==================== */}
      <div className="min-h-screen flex flex-col page-break">
        
        {/* TABELA DE ITENS - sem header repetido */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1a4168] text-white">
                  <th className="border border-white p-3 text-left">Item</th>
                  {(() => {
                    console.log('🔢 Renderizando cabeçalho código. Tipo:', tipoLayout)
                    return tipoLayout === 'castor' ? (
                      <th className="border border-white p-3 text-center" colSpan={6}>Código</th>
                    ) : (
                      <th className="border border-white p-3 text-center">Código</th>
                    )
                  })()}
                  <th className="border border-white p-3 text-left">Descrição</th>
                  <th className="border border-white p-3 text-center">Medidas</th>
                  <th className="border border-white p-3 text-center">Qtd</th>
                  <th className="border border-white p-3 text-right">Unitário</th>
                  <th className="border border-white p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => {
                  const codigoDividido = dividirCodigo(item.codigo || '')
                  
                  return (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 p-3 text-center font-bold">
                        {index + 1}
                      </td>
                      
                      {(() => {
                        console.log(`📝 Item ${index + 1} - Código: ${item.codigo} - Layout: ${tipoLayout}`)
                        return tipoLayout === 'castor' ? (
                          <>
                            {codigoDividido.length > 0 ? (
                              codigoDividido.slice(0, 6).map((digito, i) => (
                                <td key={i} className="border border-gray-300 p-2 text-center font-mono bg-blue-50">
                                  {digito}
                                </td>
                              ))
                            ) : (
                              <td colSpan={6} className="border border-gray-300 p-2 text-center text-gray-400">-</td>
                            )}
                            {Array(Math.max(0, 6 - codigoDividido.length)).fill(null).map((_, i) => (
                              <td key={`empty-${i}`} className="border border-gray-300 p-2 bg-gray-100"></td>
                            ))}
                          </>
                        ) : (
                          <td className="border border-gray-300 p-3 text-center font-mono">
                            {item.codigo || '-'}
                          </td>
                        )
                      })()}
                      
                      <td className="border border-gray-300 p-3">
                        <p className="font-semibold">{item.descricao}</p>
                        {item.especificacoes && (
                          <p className="text-sm text-gray-600 mt-1">{item.especificacoes}</p>
                        )}
                      </td>
                      
                      <td className="border border-gray-300 p-3 text-center text-sm">
                        {item.especificacoes?.match(/\d+x\d+/)?.[0] || '-'}
                      </td>
                      
                      <td className="border border-gray-300 p-3 text-center font-bold">
                        {item.quantidade}
                      </td>
                      
                      <td className="border border-gray-300 p-3 text-right">
                        {formatCurrency(item.preco_unitario)}
                      </td>
                      
                      <td className="border border-gray-300 p-3 text-right font-bold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* GRID: BOX ATENÇÃO + RESUMO FINANCEIRO */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              
              {/* BOX ATENÇÃO */}
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Atenção</h3>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">
                  Antes de confirmar o pedido, recomendamos:
                </p>
                
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Confira todos os itens do orçamento, em especial a descrição e quantidade.</li>
                  <li>• Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.</li>
                  <li>• Leia atentamente as observações do orçamento.</li>
                  <li>• Veja os Termos Gerais da 3W Hotelaria.</li>
                </ul>
              </div>
              
              {/* RESUMO FINANCEIRO */}
              <div>
                <div className="bg-[#D4AF37] text-white p-4 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Subtotal</span>
                    <span className="font-bold text-2xl">
                      {formatCurrency(subtotalCalculado)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border-x-2 border-gray-300 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">Impostos</div>
                    <div className="w-20 text-center">
                      {impostosPercentualCalculado.toFixed(2)}%
                    </div>
                    <div className="w-32 text-right font-semibold">
                      {formatCurrency(impostosCalculado)}
                    </div>
                  </div>
                </div>

                {descontoValorCalculado > 0 && (
                  <div className="bg-white border-x-2 border-gray-300 p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">Desconto</div>
                      <div className="w-20 text-center">
                        {descontoPercentualCalculado.toFixed(2)}%
                      </div>
                      <div className="w-32 text-right font-semibold text-red-600">
                        -{formatCurrency(descontoValorCalculado)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#1a4168] text-white p-4 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Valor Final</span>
                    <span className="font-bold text-3xl">
                      {formatCurrency(totalCalculado)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* GRID: FRETE/ENTREGA/DIFAL (esquerda) | CONDIÇÕES (direita) */}
            <div className="grid grid-cols-12 gap-6 mt-8">
              
              {/* LADO ESQUERDO: Frete + Entrega + Difal */}
              <div className="col-span-4 flex flex-col gap-0 h-full">
                {/* Frete e Entrega lado a lado */}
                <div className="grid grid-cols-2 gap-0">
                  {/* FRETE */}
                  <div className="border-2 border-gray-300 rounded-tl-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                      <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                        <Truck className="w-5 h-5" /> Frete
                      </p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-semibold">{orcamento.frete_tipo || 'CIF (Incluso)'}</p>
                    </div>
                  </div>
                  
                  {/* ENTREGA */}
                  <div className="border-2 border-l-0 border-gray-300 rounded-tr-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                      <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                        <Package className="w-5 h-5" /> Entrega
                      </p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-semibold">{orcamento.prazo_entrega || '45/60 dias'}</p>
                    </div>
                  </div>
                </div>
                
                {/* DIFAL - mesma largura dos 2 acima */}
                <div className="border-2 border-t-0 border-gray-300 rounded-b-lg overflow-hidden flex-1 flex flex-col">
                  <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                    <p className="font-bold text-center flex items-center justify-center gap-2">
                      <DollarSign className="w-5 h-5" /> Difal
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 text-sm text-gray-700 flex-1">
                    <p>{orcamento.difal_texto || 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.'}</p>
                  </div>
                </div>
              </div>
              
              {/* LADO DIREITO: CONDIÇÕES */}
              <div className="col-span-8 border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold text-center flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" /> Condições e Forma de Pagamento
                  </p>
                </div>
                <div className="p-4">
                  <div className="text-xs space-y-1">
                    <p className="font-semibold mb-2">ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO</p>
                    <p>• para 30/60 acréscimo de 2,0%</p>
                    <p>• para 30/60/90 acréscimo de 2,8%</p>
                    <p>• para 30/60/90/120 acréscimo de 3,00%</p>
                    <p>• para 30/60/90/120/150 acréscimo de 3,80%</p>
                    <p>• para 30/60/90/120/150/180 acréscimo de 4,20%</p>
                    <p>• para 30/60/90/120/150/180/210 acréscimo de 4,80%</p>
                    <p>• para 30/60/90/120/150/180/210/240 acréscimo de 5,20%</p>
                    <p>• para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%</p>
                    <p>• para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%</p>
                    <p className="mt-3 text-gray-600 italic">
                      IMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* OBSERVAÇÕES GERAIS */}
            {orcamento.observacoes_gerais && (
              <div className="mt-6 border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold">Observações Gerais</p>
                </div>
                <div className="p-4 min-h-[100px]">
                  <p className="text-sm whitespace-pre-wrap">{orcamento.observacoes_gerais}</p>
                </div>
              </div>
            )}
            
            {/* TERMOS LEGAIS 3W */}
            <div className="mt-6 bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#1a4168] p-2 rounded">
                  <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#D4AF37]">TERMOS LEGAIS DA 3W HOTELARIA</h3>
              </div>
              
              <div className="text-xs text-gray-700 space-y-2">
                <p>• O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.</p>
                <p>• Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.</p>
                <p>• As políticas comerciais variam conforme o Fabricante/Fornecedor.</p>
                <p>• As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição estadual do cliente, e estado da unidade/fábrica fornecedora, razão pela qual é importante que o cliente informe claramente sua localização e situação de inscrição estadual.</p>
                <p>• Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.</p>
                <p>• Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da {orcamento.fornecedor_nome || 'Fabricante'}.</p>
              </div>
            </div>
            
            {/* BOTÕES DE AÇÃO - últimos elementos */}
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <Phone className="w-6 h-6" />
                <span>Clique aqui para falar com o Vendedor</span>
              </button>
              
              <button className="bg-[#D4AF37] hover:bg-yellow-600 text-[#1a4168] font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <Package className="w-6 h-6" />
                <span>Clique aqui para confirmar o pedido</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PÁGINA 3 - PUBLICIDADE (SE HOUVER) ==================== */}
      {orcamento.imagem_publicidade_url && (
        <div className="min-h-screen flex flex-col page-break">
          <div className="bg-[#1a4168] text-white p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-10" />
              <div className="text-sm space-y-1">
                <p className="flex items-center gap-1"><Globe className="w-3 h-3" /> www.3whotelaria.com.br</p>
                <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> +55 (11) 5197-5779</p>
                <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> comercial1@3whotelaria.com.br</p>
              </div>
              <div className="bg-[#D4AF37] text-[#1a4168] px-6 py-2 rounded font-bold">
                Orçamento {orcamento.numero}
              </div>
              {orcamento.fornecedor_nome && (
                <div className="bg-white p-2 rounded">
                  <p className="text-xl font-bold text-red-600">
                    {orcamento.fornecedor_nome.split(' ')[0]}
                  </p>
                </div>
              )}
              <div className="text-sm text-right">
                <p>Emitido em {formatDate(orcamento.data_emissao || orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
                <div className="mt-1 bg-gray-200 text-gray-700 px-3 py-1 rounded inline-block text-xs">
                  {orcamento.status.toUpperCase()}
            </div>

            {/* TERMOS DO FORNECEDOR - APENAS MIDEA */}
            {tipoLayout === 'midea' && orcamento.termos_fornecedor && (
              <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  {fornecedor?.logotipo_url ? (
                    <img src={fornecedor.logotipo_url} alt={fornecedor.nome_fantasia} className="h-12" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">
                      {orcamento.fornecedor_nome}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {orcamento.termos_fornecedor}
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-12">
            <div className="text-center max-w-4xl">
              <h2 className="text-6xl font-bold text-[#1a4168] mb-8">
                ESPAÇO PARA PUBLICIDADE
              </h2>
              
              <img 
                src={orcamento.imagem_publicidade_url} 
                alt="Publicidade" 
                className="w-full rounded-2xl shadow-2xl mb-8"
              />
              
              <div className="flex items-center justify-center gap-12">
                <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-20" />
                <p className="text-5xl font-bold text-gray-400">E</p>
                {orcamento.fornecedor_nome && (
                  <p className="text-4xl font-bold text-red-600">
                    {orcamento.fornecedor_nome.split(' ')[0]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
