import { Orcamento, OrcamentoItem } from '@/lib/types'
import { Mail, MapPin, Phone, Truck, Package, CreditCard, AlertCircle, DollarSign, Globe } from 'lucide-react'

interface Props {
  orcamento: Orcamento
  itens: OrcamentoItem[]
}

export function OrcamentoTemplate({ orcamento, itens }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
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

  return (
    <div className="bg-white font-sans">
      {/* ==================== PÁGINA 1 - CAPA ==================== */}
      <div className="min-h-screen flex flex-col page-break">
        
        {/* HEADER */}
        <div className="bg-[#1a4168] text-white p-6">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            <div>
              <img 
                src="/logo_3Whotelaria.jpeg" 
                alt="3W Hotelaria" 
                className="h-16 mb-4"
              />
              
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <span>www.3whotelaria.com.br</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+55 (11) 5197-5779</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>comercial1@3whotelaria.com.br</span>
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="bg-[#D4AF37] text-[#1a4168] px-8 py-3 rounded-lg inline-block mb-4">
                <p className="text-sm font-semibold">Orçamento {orcamento.numero}</p>
              </div>
              
              {orcamento.fornecedor_nome && (
                <div className="bg-white p-3 rounded inline-block">
                  <p className="text-2xl font-bold text-red-600">
                    {orcamento.fornecedor_nome.split(' ')[0]}
                  </p>
                </div>
              )}
              
              <div className="mt-4 space-y-1 text-sm">
                <p>Emitido em {formatDate(orcamento.data_emissao || orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
              
              <div className="mt-2 bg-gray-200 text-gray-700 px-4 py-1 rounded inline-block text-sm font-semibold">
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
      <div className="text-sm space-y-1">
                <p className="font-bold text-lg text-[#1a4168] mb-2">
                  {orcamento.cliente_cnpj}  {orcamento.cliente_nome}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#1a4168]" />
                  {orcamento.cliente_email || 'mario.quinalha@marriott.com'}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1a4168]" />
                  {orcamento.cliente_endereco?.split(',')[0] || 'Alameda Armenio Mendes, 70'}
                </p>
                <p className="ml-7 text-xs">
                  {orcamento.cliente_endereco?.split(',').slice(1).join(',') || 'Santos  SP  CEP 11035-260'}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#1a4168]" />
                  {orcamento.cliente_telefone || '(13) 99191-7669'}
                </p>
              </div>
              
              {/* Endereço de Entrega - Direita */}
              <div className="text-sm text-right space-y-1">
                <p className="font-bold text-lg text-[#1a4168]">Endereço de Entrega</p>
                <p>{orcamento.cliente_endereco?.split(',')[0] || 'Alameda Armenio Mendes, 70'}</p>
                <p>{orcamento.cliente_endereco?.split(',').slice(1).join(',') || 'Santos  SP  CEP 11035-260'}</p>
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
                  <th className="border border-white p-3 text-center" colSpan={6}>Código</th>
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
                      
                      {codigoDividido.length > 0 ? (
                        codigoDividido.slice(0, 6).map((digito, i) => (
                          <td key={i} className="border border-gray-300 p-2 text-center font-mono bg-blue-50">
                            {digito}
                          </td>
                        ))
                      ) : (
                        <td colSpan={6} className="border border-gray-300 p-2 text-center text-gray-400">
                          -
                        </td>
                      )}
                      
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
                    <span className="font-bold text-2xl">{formatCurrency(orcamento.subtotal)}</span>
                  </div>
                </div>

                <div className="bg-white border-x-2 border-gray-300 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">Impostos</div>
                    <div className="w-20 text-center">{orcamento.impostos_percentual?.toFixed(2) || 0}%</div>
                    <div className="w-32 text-right font-semibold">
                      {formatCurrency(orcamento.impostos)}
                    </div>
                  </div>
                </div>

                {orcamento.desconto_valor > 0 && (
                  <div className="bg-white border-x-2 border-gray-300 p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">Desconto</div>
                      <div className="w-20 text-center">{orcamento.desconto_percentual?.toFixed(2) || 0}%</div>
                      <div className="w-32 text-right font-semibold text-red-600">
                        -{formatCurrency(orcamento.desconto_valor)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#1a4168] text-white p-4 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Valor Final</span>
                    <span className="font-bold text-3xl">{formatCurrency(orcamento.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 3 COLUNAS: FRETE | ENTREGA | CONDIÇÕES */}
            <div className="grid grid-cols-12 gap-6 mt-8">
              
              {/* FRETE - 2 colunas */}
              <div className="col-span-2 border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                    <Truck className="w-5 h-5" /> Frete
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-semibold">{orcamento.frete_tipo || 'CIF (Incluso)'}</p>
                </div>
              </div>
              
              {/* ENTREGA - 2 colunas */}
              <div className="col-span-2 border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                    <Package className="w-5 h-5" /> Entrega
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-semibold">{orcamento.prazo_entrega || '45/60 dias'}</p>
                </div>
              </div>
              
              {/* CONDIÇÕES - 8 colunas (maior) */}
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
            
            {/* BOX DIFAL */}
            <div className="mt-6 border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                <p className="font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Difal
                </p>
              </div>
              <div className="p-4 bg-blue-50 text-sm text-gray-700">
                <p>{orcamento.difal_texto || 'Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.'}</p>
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
                <span className="text-2xl">💬</span>
                <span>Clique aqui para falar com o Vendedor</span>
              </button>
              
              <button className="bg-[#D4AF37] hover:bg-yellow-600 text-[#1a4168] font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <span className="text-2xl">🔨</span>
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
                <p>🌐 www.3whotelaria.com.br</p>
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
      
      {/* TERMOS DO FORNECEDOR */}
      {orcamento.termos_fornecedor && orcamento.termos_fornecedor.length > 200 && (
        <div className="mt-12 p-8 border-t-4 border-[#1a4168]">
          <div className="max-w-7xl mx-auto bg-blue-50 rounded-lg p-6">
            {orcamento.fornecedor_nome && (
              <div className="mb-4">
                <p className="text-2xl font-bold text-blue-600">
                  {orcamento.fornecedor_nome}
                </p>
              </div>
            )}
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {orcamento.termos_fornecedor}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
