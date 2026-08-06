/**
 * Consentimento de marketing por WhatsApp — vive em contato_whatsapp_consentimento,
 * um registro por contato×categoria. Usado tanto pelo ContatoModal (onde se
 * registra) quanto pelo módulo Marketing → WhatsApp (onde se consome pra
 * montar público de campanha). Ver [[modulo-marketing-whatsapp]].
 */

export type CategoriaConsentimento = "promocoes" | "novidades" | "avisos"
export type StatusConsentimento = "opt_in" | "opt_out"
export type OrigemConsentimento =
  | "formulario_site"
  | "confirmacao_atendimento"
  | "cadastro_manual"
  | "anuncio_click_to_whatsapp"
  | "outro"

export const CATEGORIAS_CONSENTIMENTO: CategoriaConsentimento[] = ["promocoes", "novidades", "avisos"]

export const CATEGORIA_CONSENTIMENTO_LABEL: Record<CategoriaConsentimento, string> = {
  promocoes: "Promoções", novidades: "Novidades", avisos: "Avisos",
}

export const ORIGEM_CONSENTIMENTO_LABEL: Record<OrigemConsentimento, string> = {
  formulario_site: "Formulário do site",
  confirmacao_atendimento: "Confirmado no Atendimento",
  cadastro_manual: "Cadastro manual (confirmado)",
  anuncio_click_to_whatsapp: "Anúncio click-to-WhatsApp",
  outro: "Outro",
}

/** Normaliza telefone: só dígitos, garante DDI 55 (mesma regra de api/enviar-mensagem.ts). */
export function normalizarTelefone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("55") ? digits : `55${digits}`
}
