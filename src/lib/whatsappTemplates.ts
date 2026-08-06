/**
 * Helpers compartilhados de template do WhatsApp — usados por
 * AdminTemplatesWhatsApp.tsx (criação) e reaproveitáveis por qualquer outro
 * módulo que precise validar nome/variáveis no mesmo formato da Meta.
 */

/** Transforma texto livre no formato de nome que a Meta exige pra template. */
export function slugifyNomeTemplate(raw: string): string {
  const semAcento = Array.from(raw.normalize("NFD"))
    .filter((ch) => { const c = ch.codePointAt(0) || 0; return c < 0x300 || c > 0x36f })
    .join("")
  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 200)
}

/** Detecta {{1}}, {{2}}... no corpo do template, em ordem crescente e sem repetir. */
export function detectarVariaveis(texto: string): number[] {
  const nums = [...texto.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10))
  return Array.from(new Set(nums)).sort((a, b) => a - b)
}
