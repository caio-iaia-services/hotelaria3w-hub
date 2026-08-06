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
