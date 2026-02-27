import { Orcamento, OrcamentoItem } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  orcamento: Orcamento
  itens: OrcamentoItem[]
}

export function OrcamentoVisualizacao({ orcamento, itens }: Props) {
  return (
    <div className="bg-white">
      {/* HEADER COM GRADIENTE */}
      <div className="relative bg-gradient-to-r from-[#1E4A7C] to-[#2563a8] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <img
                src="/logo_3Whotelaria.jpeg"
                alt="3W Hotelaria"
                className="h-16 mb-4"
              />
              <p className="text-sm opacity-90">comercial1@3whotelaria.com.br</p>
              <p className="text-sm opacity-90">+55 11 5197-5779</p>
              <p className="text-sm opacity-90">3whotelaria.com.br</p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-[#D4AF37] text-[#1E4A7C] px-6 py-3 rounded-lg">
                <p className="text-xs font-medium opacity-90">PROPOSTA COMERCIAL</p>
                <p className="text-3xl font-bold">{orcamento.numero}</p>
              </div>
              <div className="mt-4 text-sm space-y-1">
                <p>Enviada em {formatDate(orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-white to-[#D4AF37]"></div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="max-w-6xl mx-auto px-8 py-6 border-b-2 border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
            <h2 className="text-2xl font-bold text-[#1E4A7C] mb-2">
              {orcamento.cliente_nome}
            </h2>
            {orcamento.cliente_razao_social && (
              <p className="text-sm text-gray-600 mb-1">{orcamento.cliente_razao_social}</p>
            )}
            {orcamento.cliente_cnpj && (
              <p className="text-sm text-gray-600 mb-1">CNPJ: {orcamento.cliente_cnpj}</p>
            )}
            {orcamento.codigo_empresa && (
              <p className="text-sm font-medium text-[#1E4A7C]">
                Código: {orcamento.codigo_empresa}
              </p>
            )}
          </div>

          <div className="text-right text-sm text-gray-600">
            {orcamento.cliente_endereco && (
              <>
                <p>{orcamento.cliente_endereco}</p>
                {orcamento.cliente_email && <p className="mt-2">{orcamento.cliente_email}</p>}
                {orcamento.cliente_telefone && <p>{orcamento.cliente_telefone}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* FORNECEDOR */}
      {orcamento.fornecedor_nome && (
        <div className="max-w-6xl mx-auto px-8 py-8 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white rounded-lg shadow-md flex items-center justify-center">
              <span className="text-2xl font-bold text-[#1E4A7C]">
                {orcamento.fornecedor_nome.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fornecedor</p>
              <h3 className="text-xl font-bold text-[#1E4A7C]">
                {orcamento.fornecedor_nome}
              </h3>
              {orcamento.operacao && (
                <span className="inline-block mt-1 px-3 py-1 bg-[#1E4A7C] text-white text-xs rounded-full">
                  {orcamento.operacao}
                </span>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ITENS DO ORÇAMENTO */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <h3 className="text-xl font-bold text-[#1E4A7C] mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-[#D4AF37] rounded-full"></div>
          Itens do Orçamento
        </h3>

        <div className="space-y-4">
          {itens.map((item, index) => (
            <div
              key={item.id}
              className="border-l-4 border-[#D4AF37] bg-gray-50 rounded-r-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-[#1E4A7C] text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    {item.codigo && (
                      <span className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono">
                        {item.codigo}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {item.descricao}
                  </h4>
                  {item.especificacoes && (
                    <p className="text-sm text-gray-600 mt-2">
                      {item.especificacoes}
                    </p>
                  )}
                </div>

                <div className="text-right ml-6">
                  <p className="text-2xl font-bold text-[#1E4A7C]">
                    {formatCurrency(item.total)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.quantidade} x {formatCurrency(item.preco_unitario)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RESUMO FINANCEIRO */}
      <div className="max-w-6xl mx-auto px-8 py-8 bg-gray-50">
        <div className="max-w-md ml-auto space-y-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span className="font-semibold">{formatCurrency(orcamento.subtotal)}</span>
          </div>

          {orcamento.frete > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Frete:</span>
              <span className="font-semibold">{formatCurrency(orcamento.frete)}</span>
            </div>
          )}

          {orcamento.desconto > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span className="font-semibold">-{formatCurrency(orcamento.desconto)}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-300 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">VALOR TOTAL:</span>
              <span className="text-3xl font-bold text-[#1E4A7C]">
                {formatCurrency(orcamento.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONDIÇÕES COMERCIAIS */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {orcamento.prazo_entrega && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <h4 className="font-bold text-blue-900 mb-2">📦 Prazo de Entrega</h4>
              <p className="text-blue-800">{orcamento.prazo_entrega}</p>
            </div>
          )}

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-amber-900 mb-2">⏰ Validade da Proposta</h4>
            <p className="text-amber-800">
              {orcamento.validade_dias} dias (até {formatDate(orcamento.data_validade)})
            </p>
          </div>
        </div>

        {orcamento.condicoes_pagamento && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-green-900 mb-2">💳 Condições de Pagamento</h4>
            <div className="text-green-800 whitespace-pre-wrap">
              {typeof orcamento.condicoes_pagamento === 'string'
                ? orcamento.condicoes_pagamento
                : orcamento.condicoes_pagamento.texto}
            </div>
          </div>
        )}

        {orcamento.observacoes && (
          <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-purple-900 mb-2">📝 Observações</h4>
            <p className="text-purple-800 whitespace-pre-wrap">{orcamento.observacoes}</p>
          </div>
        )}
      </div>

      {/* ÁREA DE MARKETING (Hero Banner) */}
      {orcamento.imagem_marketing_url && (
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={orcamento.imagem_marketing_url}
              alt="Campanha Marketing"
              className="w-full h-auto"
            />
            <div className="absolute top-4 right-4">
              <span className="inline-block px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-full shadow-lg">
                ✨ Oportunidade Especial
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-8 py-8 bg-gray-100">
        {orcamento.termos_fornecedor && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-[#1E4A7C] mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-[#D4AF37] rounded-full"></div>
              Termos do Fabricante
            </h3>
            <div className="bg-white rounded-lg p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {orcamento.termos_fornecedor}
            </div>
          </div>
        )}

        {orcamento.termos_3w && (
          <div>
            <h3 className="text-lg font-bold text-[#1E4A7C] mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-[#D4AF37] rounded-full"></div>
              Termos 3W HOTELARIA
            </h3>
            <div className="bg-white rounded-lg p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {orcamento.termos_3w}
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ COM ASSINATURA */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="border-t-2 border-gray-300 pt-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-sm text-gray-600 mb-4">Pela 3W HOTELARIA</p>
              <div className="border-t-2 border-gray-400 pt-2">
                <p className="font-bold text-[#1E4A7C]">Equipe Comercial 3W HOTELARIA</p>
                <p className="text-sm text-gray-600">comercial1@3whotelaria.com.br</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-4">Aceite do Cliente</p>
              {orcamento.assinatura_cliente ? (
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                  <p className="text-green-800 font-semibold">✓ Assinado digitalmente</p>
                  <p className="text-sm text-green-700 mt-1">
                    {formatDate(orcamento.assinado_em)}
                  </p>
                </div>
              ) : (
                <div className="border-t-2 border-gray-400 pt-2 h-20">
                  <p className="text-sm text-gray-400 italic">Aguardando assinatura</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-gradient-to-r from-[#1E4A7C] to-[#2563a8] text-white text-center py-6">
        <p className="text-sm">
          3W HOTELARIA - Soluções Integradas para Hotelaria
        </p>
        <p className="text-xs opacity-75 mt-1">
          São Paulo, SP - Brasil
        </p>
      </div>
    </div>
  )
}
