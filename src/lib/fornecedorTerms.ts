export const TERMOS_MIDEA_FALLBACK_ANTIGO =
  'Termos legais Midea Carrier não cadastrados no fornecedor. Solicite ao comercial a versão vigente para anexar ao orçamento.'

export const CONDICOES_MIDEA_PLACEHOLDER_ANTIGO =
  'Condições dinâmicas conforme valor do pedido (ver orçamento)'

export const CONDICOES_MIDEA_TEXTO_PADRAO = `Para compras abaixo de 50 mil pagamento:
 - no pix 
 - cartão de crédito 3x sem juros
 - boleto em 3 x com 2.5% de acréscimo

Compras acima de 50 mil pagamento:
  - no cartão ate 10x sem juros 
  - 3 x no boleto ou pix

Outras formas de pagamento podem ser avaliadas.`

export const TERMOS_MIDEA_LEGAIS = `Esta Proposta Comercial e/ou Contrato contempla a oferta e/ou venda de produtos fabricados e comercializados através das empresas Springer e Climazon, pertencentes ao grupo Midea Carrier.

O fabricante dos produtos não se responsabiliza por quaisquer danos a terceiros e/ou danos indiretos em decorrência do uso, manuseio e instalação dos produtos, incluindo, mas não se limitando a lucros cessantes, sob qualquer fundamento ou teoria, perda da chance ou perda da oportunidade.

Sendo assim, o fabricante somente será responsável por eventuais danos materiais diretos, isto é, prejuízos diretos comprovadamente sofridos em decorrência de atos culposos e/ou dolosos de única e exclusiva responsabilidade do fabricante, sendo que o montante de responsabilidade em relação aos danos diretos, em nenhuma hipótese, poderá superar o valor total dos itens desta Proposta Comercial relacionados a Produtos de fabricação da Midea Carrier.`

export const IMAGEM_MIDEA_PADRAO_URL = '/imagem_midea_padrao.jpeg'

function normalizarTextoPagamento(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolverCondicoesPagamentoMidea(condicoesPagamento: string | null | undefined): string {
  const texto = String(condicoesPagamento || '').trim()
  if (!texto) return CONDICOES_MIDEA_TEXTO_PADRAO

  const textoNormalizado = normalizarTextoPagamento(texto)

  if (
    textoNormalizado.includes(normalizarTextoPagamento(CONDICOES_MIDEA_PLACEHOLDER_ANTIGO)) ||
    textoNormalizado.includes('este valor e para pagamento a vista antecipado') ||
    (textoNormalizado.includes('para compras abaixo de') && textoNormalizado.includes('compras acima de'))
  ) {
    return CONDICOES_MIDEA_TEXTO_PADRAO
  }

  return texto
}

export function resolverTermosFornecedor(
  termosFornecedor: string | null | undefined,
  isMidea: boolean
): string | null {
  const texto = String(termosFornecedor || '').trim()

  if (texto === TERMOS_MIDEA_FALLBACK_ANTIGO) return TERMOS_MIDEA_LEGAIS
  if (texto) return texto
  if (isMidea) return TERMOS_MIDEA_LEGAIS

  return null
}

export function resolverImagemMarketing(
  imagemOrcamento: string | null | undefined,
  imagemFornecedor: string | null | undefined,
  isMidea: boolean
): string | null {
  const imagemDoOrcamento = String(imagemOrcamento || '').trim()
  if (imagemDoOrcamento) return imagemDoOrcamento

  const imagemDoFornecedor = String(imagemFornecedor || '').trim()
  if (imagemDoFornecedor) return imagemDoFornecedor

  if (isMidea) return IMAGEM_MIDEA_PADRAO_URL

  return null
}
