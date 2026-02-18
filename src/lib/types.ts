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
  estagio: 'lead' | 'contato' | 'proposta' | 'negociacao' | 'fechado'
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
