export interface Cliente {
  id: string
  nome_fantasia: string
  razao_social: string
  cnpj: string
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  segmento_id: string | null
  status: string
  tipo: string
  created_at?: string
  endereco?: string | null
  bairro?: string | null
  cep?: string | null
  observacoes?: string | null
  pais?: string | null
}

export interface Oportunidade {
  id: string
  numero: string
  cliente_id: string
  operacao: string
  gestao: string
  observacoes: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface OportunidadeComCliente extends Oportunidade {
  cliente: {
    id: string
    nome_fantasia: string
    cnpj: string
    razao_social?: string
    cidade?: string | null
    estado?: string | null
    email?: string | null
    telefone?: string | null
  } | null
}

export interface CRMCard {
  id: string
  oportunidade_id: string
  cliente_id: string
  operacao: string
  gestao: string
  estagio: 'lead' | 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'consolidacao' | 'pos_venda' | 'realizado' | 'perdido'
  cliente_nome: string
  cliente_cnpj: string
  cliente_cidade: string
  cliente_estado: string
  cliente_segmento: string | null
  observacoes: string | null
  ordem: number
  created_at: string
  updated_at: string
}

export interface DocumentoComercial {
  id: string
  card_id: string
  cliente_id: string
  tipo: 'cotacao' | 'orcamento' | 'contrato' | 'cobranca'
  numero: string | null
  titulo: string
  arquivo_nome: string | null
  arquivo_url: string | null
  google_drive_id: string | null
  conteudo: any
  valor_total: number | null
  moeda: string
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado'
  enviado_em: string | null
  aprovado_em: string | null
  created_at: string
  updated_at: string
}

export interface AcaoComercialLog {
  id: string
  card_id: string
  documento_id: string | null
  acao: string
  descricao: string | null
  created_at: string
}
