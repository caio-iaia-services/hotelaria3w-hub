/**
 * Valores fixos de status/qualificação de `contatos` — espelha as mesmas
 * opções usadas em ContatoModal.tsx e Contatos.tsx (duplicado lá também;
 * não centralizado por enquanto pra não mexer nesses dois arquivos numa
 * tarefa que era só sobre campanha). Usado pelos filtros avançados de
 * campanha em Marketing → WhatsApp.
 */

export type StatusContato = "ativo" | "inativo" // "bloqueado" fica de fora de propósito — nunca é selecionável em campanha

export const STATUS_CONTATO_LABEL: Record<StatusContato, string> = {
  ativo: "Ativo", inativo: "Inativo",
}

// Região não é uma coluna do banco — é calculada a partir do Estado (UF) da
// empresa. Mesmo mapeamento usado em Clientes.tsx/BuscarEmpresas.tsx, pra
// ficar consistente com o resto do sistema.
export const ESTADOS_POR_REGIAO: Record<string, string[]> = {
  Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["GO", "MT", "MS", "DF"],
  Sudeste: ["SP", "RJ", "MG", "ES"],
  Sul: ["RS", "SC", "PR"],
}

export const REGIOES = Object.keys(ESTADOS_POR_REGIAO)

export const QUALIFICACAO_OPTIONS: { value: string; label: string }[] = [
  { value: "cadastrado", label: "Cadastrado" },
  { value: "higienizado", label: "Higienizado" },
  { value: "aquecido", label: "Aquecido" },
  { value: "em_prospeccao", label: "Em Prospecção" },
  { value: "ativo_super", label: "Ativo Super" },
  { value: "ativo_interessado", label: "Ativo Interessado" },
  { value: "ativo_em_observacao", label: "Ativo Em Observação" },
  { value: "com_defeito", label: "Com Defeito" },
  { value: "inativo", label: "Inativo" },
]

// Fonte do contato (de onde o registro veio) — usado pelo filtro Fonte em
// Contatos.tsx e pelo campo "Fonte" do ContatoModal. Reaproveita a coluna
// `origem` do banco (antes usada com valores como "WIX"/"Indicação"/"Feira";
// migração 2026-08-13 remapeou a base legada existente para "Base 3W").
export const FONTE_OPTIONS: { value: string; label: string }[] = [
  { value: "Wix", label: "Wix" },
  { value: "Empresa Aqui", label: "Empresa Aqui" },
  { value: "Base 3W", label: "Base 3W" },
  { value: "Usuário", label: "Usuário" },
  { value: "IA", label: "IA" },
]

// Qualificações visíveis por Status — usado pelo filtro de Qualificação em
// Contatos.tsx, que restringe as opções ao grupo do(s) Status marcado(s)
// (união dos dois grupos se nenhum ou os dois estiverem marcados).
export const QUALIFICACAO_POR_STATUS: Record<StatusContato, string[]> = {
  ativo: ["higienizado", "aquecido", "em_prospeccao", "ativo_super", "ativo_interessado", "ativo_em_observacao"],
  inativo: ["cadastrado", "com_defeito", "inativo"],
}

// Destinos de exportação rastreados em `contatos_exportacoes` — hoje só o
// Wix é usado de verdade (pedido do cliente pra sincronizar sem duplicar a
// cada exportação), mas a lista já é o ponto único pra adicionar outro
// destino no futuro sem tocar em schema de novo.
export const DESTINOS_EXPORTACAO: { value: string; label: string }[] = [
  { value: "wix", label: "Wix" },
]
