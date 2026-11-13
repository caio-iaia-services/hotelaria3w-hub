/**
 * Converte valor digitado ou calculado em número.
 *  - number → como está (ex.: 677.52 continua 677.52);
 *  - texto com vírgula → formato BR ("1.054,17" → 1054.17);
 *  - texto sem vírgula → ponto é decimal ("677.52" → 677.52).
 * Não usar replace(/\./g, "") em número: transforma 677.52 em 67752.
 */
export function paraNumero(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value).trim()
  const n = parseFloat(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(n) ? n : 0
}
