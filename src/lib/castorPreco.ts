// Regras de preço Castor por região — "TABELA ATUALIZADA EM 07/10/2026" (colchão / travesseiros / capa / leleca / kit pés / diversos).
// Dados internos: não aparecem na proposta ao cliente.

export interface RegraCastor {
  tabela: string // nº da tabela atacado da região (5140…5154)
  regiao: string // rótulo exibido
  desconto: number // % de desconto da região
  acrescimo: number // % de acréscimo sobre a tabela padrão
}

/** A tabela 5140 (lista "A-28.00 ATACADO") já vem com 28% de desconto embutido nos preços. */
export const DESCONTO_EMBUTIDO_REFERENCIA = 28

/** Regra aplicada quando o estado do cliente não é identificado: equivale à própria tabela de referência. */
export const REGRA_PADRAO: RegraCastor = {
  tabela: '5140', regiao: 'Padrão (SP/PR/GO/DF/MS)', desconto: DESCONTO_EMBUTIDO_REFERENCIA, acrescimo: 0,
}

interface RegraUF extends RegraCastor { ufs: string[] }

const REGRAS: RegraUF[] = [
  { tabela: '5140', regiao: 'SP/PR/GO/DF/MS', ufs: ['SP', 'PR', 'GO', 'DF', 'MS'], desconto: 28, acrescimo: 0 },
  { tabela: '5141', regiao: 'BA/SE/PE/AL', ufs: ['BA', 'SE', 'PE', 'AL'], desconto: 31, acrescimo: 10 },
  { tabela: '5142', regiao: 'RN/PB', ufs: ['RN', 'PB'], desconto: 31, acrescimo: 15 },
  { tabela: '5143', regiao: 'CE/PI/MA', ufs: ['CE', 'PI', 'MA'], desconto: 31, acrescimo: 20 },
  { tabela: '5144', regiao: 'Rio Grande do Sul', ufs: ['RS'], desconto: 32.5, acrescimo: 0 },
  { tabela: '5146', regiao: 'SC', ufs: ['SC'], desconto: 31, acrescimo: 0 },
  { tabela: '5147', regiao: 'RJ/ES', ufs: ['RJ', 'ES'], desconto: 32.5, acrescimo: 5 },
  { tabela: '5148', regiao: 'MT', ufs: ['MT'], desconto: 28, acrescimo: 5 },
  { tabela: '5149', regiao: 'MG', ufs: ['MG'], desconto: 28.5, acrescimo: 5 },
  { tabela: '5151', regiao: 'RO/TO/PA/AC', ufs: ['RO', 'TO', 'PA', 'AC'], desconto: 28, acrescimo: 25 },
  { tabela: '5152', regiao: 'AP', ufs: ['AP'], desconto: 28, acrescimo: 45 },
  { tabela: '5153', regiao: 'AM/RR', ufs: ['AM', 'RR'], desconto: 28, acrescimo: 50 },
]

const REGRA_PALMAS: RegraCastor = { tabela: '5150', regiao: 'Palmas', desconto: 28, acrescimo: 15 }

const NOMES_UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
}

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

export function normalizarUF(estado?: string | null): string | null {
  if (!estado) return null
  const t = estado.trim()
  if (/^[a-zA-Z]{2}$/.test(t)) return t.toUpperCase()
  return NOMES_UF[semAcento(t)] ?? null
}

/** Regra da região do cliente (por UF; Palmas/TO tem tabela própria). null se o estado não for identificado. */
export function regraPorLocal(estado?: string | null, cidade?: string | null): RegraCastor | null {
  const uf = normalizarUF(estado)
  if (!uf) return null
  if (uf === 'TO' && cidade && semAcento(cidade) === 'palmas') return REGRA_PALMAS
  const r = REGRAS.find(x => x.ufs.includes(uf))
  if (!r) return null
  const { ufs: _ufs, ...regra } = r
  return regra
}

const arred = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Preço unitário real = referência × (1 + acréscimo) × (1 − desconto) ÷ (1 − desconto embutido na referência).
 * Para SP/PR/GO/DF/MS (28% / sem acréscimo) o resultado é a própria referência.
 */
export function calcularPrecoReal(referencia: number, descontoPct: number, acrescimoPct: number): number {
  if (!Number.isFinite(referencia) || referencia <= 0) return 0
  const d = Number.isFinite(descontoPct) ? descontoPct : DESCONTO_EMBUTIDO_REFERENCIA
  const a = Number.isFinite(acrescimoPct) ? acrescimoPct : 0
  return arred((referencia * (1 + a / 100) * (1 - d / 100)) / (1 - DESCONTO_EMBUTIDO_REFERENCIA / 100))
}
