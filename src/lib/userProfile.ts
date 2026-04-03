export interface UserProfile {
  id: string
  email: string
  nome: string
  role: 'admin' | 'comercial' | 'tecnico'
  gestao: string | null  // null = acesso total
  modulos: string[]
  ativo: boolean
}

export const TODOS_MODULOS = [
  { key: 'dashboard',        label: 'Dashboard' },
  { key: 'oportunidades',    label: 'Oportunidades' },
  { key: 'crm',              label: 'CRM' },
  { key: 'orcamentos',       label: 'Orçamentos' },
  { key: 'acoes_comerciais', label: 'Ações Comerciais' },
  { key: 'clientes',         label: 'Clientes' },
  { key: 'atendimento',      label: 'Atendimento' },
  { key: 'fornecedores',     label: 'Fornecedores' },
  { key: 'marketing',        label: 'Marketing' },
  { key: 'financeiro',       label: 'Financeiro' },
  { key: 'planejamento',     label: 'Planejamento' },
  { key: 'admin',            label: 'Admin' },
  { key: 'admin_usuarios',   label: 'Gestão de Usuários' },
]

export const MODULOS_COMERCIAL_PADRAO = [
  'dashboard', 'oportunidades', 'crm', 'orcamentos',
  'acoes_comerciais', 'clientes', 'atendimento', 'fornecedores',
]

export const MODULOS_ADMIN_PADRAO = TODOS_MODULOS.map(m => m.key)

export const GESTOES = ['G1', 'G2', 'G3', 'G4']

export const gestaoLabel: Record<string, string> = {
  G1: 'Gestão 1',
  G2: 'Gestão 2',
  G3: 'Gestão 3',
  G4: 'Gestão 4',
}

export const gestaoUrlParam: Record<string, string> = {
  G1: 'gestao-1',
  G2: 'gestao-2',
  G3: 'gestao-3',
  G4: 'gestao-4',
}
