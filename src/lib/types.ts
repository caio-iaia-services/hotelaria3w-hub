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
