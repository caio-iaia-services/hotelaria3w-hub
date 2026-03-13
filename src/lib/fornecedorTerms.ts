export const TERMOS_MIDEA_FALLBACK_ANTIGO =
  'Termos legais Midea Carrier não cadastrados no fornecedor. Solicite ao comercial a versão vigente para anexar ao orçamento.'

export const TERMOS_MIDEA_LEGAIS = `Esta Proposta Comercial e/ou Contrato contempla a oferta e/ou venda de produtos fabricados e comercializados através das empresas Springer e Climazon, pertencentes ao grupo Midea Carrier.

O fabricante dos produtos não se responsabiliza por quaisquer danos a terceiros e/ou danos indiretos em decorrência do uso, manuseio e instalação dos produtos, incluindo, mas não se limitando a lucros cessantes, sob qualquer fundamento ou teoria, perda da chance ou perda da oportunidade.

Sendo assim, o fabricante somente será responsável por eventuais danos materiais diretos, isto é, prejuízos diretos comprovadamente sofridos em decorrência de atos culposos e/ou dolosos de única e exclusiva responsabilidade do fabricante, sendo que o montante de responsabilidade em relação aos danos diretos, em nenhuma hipótese, poderá superar o valor total dos itens desta Proposta Comercial relacionados a Produtos de fabricação da Midea Carrier.`

function normalizarTermosFornecedor(termos: string | null | undefined): string {
  const texto = String(termos || '').trim()
  if (!texto) return ''
  if (texto === TERMOS_MIDEA_FALLBACK_ANTIGO) return ''
  return texto
}

export function resolverTermosFornecedor(
  termosFornecedor: string | null | undefined,
  isMidea: boolean
): string | null {
  const termosLimpos = normalizarTermosFornecedor(termosFornecedor)

  if (termosLimpos) return termosLimpos
  if (isMidea) return TERMOS_MIDEA_LEGAIS

  return null
}
