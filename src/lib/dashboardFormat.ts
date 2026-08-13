import { gestaoLabel } from "@/lib/userProfile";

// ─── Paginação ──────────────────────────────────────────────────────────────

/**
 * O Supabase (PostgREST) corta qualquer select em 1000 linhas por padrão,
 * mesmo pedindo `.limit()` maior no client — isso já causou KPIs errados
 * no Dashboard (ex.: total de orçamentos calculado em cima de 1000 de 2691).
 * Usar isso pra qualquer consulta que possa ultrapassar 1000 linhas.
 */
export async function fetchPaginado<T>(
  montarQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamanhoPagina = 1000,
  maxPaginas = 30
): Promise<T[]> {
  const linhas: T[] = [];
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const from = pagina * tamanhoPagina;
    const { data, error } = await montarQuery(from, from + tamanhoPagina - 1);
    if (error) {
      console.error("fetchPaginado:", error);
      break;
    }
    const bloco = data || [];
    linhas.push(...bloco);
    if (bloco.length < tamanhoPagina) break;
  }
  return linhas;
}

// ─── Formatação de valores ─────────────────────────────────────────────────

export function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function formatCurrencyFull(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ─── Status de orçamento ────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  rascunho: "hsl(215, 16%, 65%)",
  enviado: "hsl(224, 64%, 33%)",
  aprovado: "hsl(152, 60%, 40%)",
  consolidado: "hsl(152, 45%, 30%)",
  rejeitado: "hsl(0, 72%, 55%)",
  cancelado: "hsl(340, 60%, 50%)",
  refutado: "hsl(280, 50%, 50%)",
  expirado: "hsl(25, 90%, 55%)",
};

export const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  consolidado: "Consolidado",
  rejeitado: "Rejeitado",
  cancelado: "Cancelado",
  refutado: "Refutado",
  expirado: "Expirado",
};

/**
 * "consolidado" = orçamento virou nota fiscal (confirmado pelo Caio, 13/08/2026) —
 * é um estágio ainda mais avançado que "aprovado", conta como venda ganha.
 * "cancelado"/"refutado" tratados como perdido (mesma família de "rejeitado") —
 * assumido por analogia, não confirmado explicitamente; corrigir se estiver errado.
 */
export const STATUS_GANHOS = ["aprovado", "consolidado"];
export const STATUS_PERDIDOS = ["rejeitado", "cancelado", "refutado"];

export const statusBadgeClass: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600 border-gray-200",
  enviado: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  consolidado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
  cancelado: "bg-pink-100 text-pink-700 border-pink-200",
  refutado: "bg-purple-100 text-purple-700 border-purple-200",
  expirado: "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Gestões ────────────────────────────────────────────────────────────────

export const GESTAO_COLORS: Record<string, string> = {
  G1: "hsl(224, 64%, 33%)",
  G2: "hsl(152, 60%, 40%)",
  G3: "hsl(25, 90%, 55%)",
  G4: "hsl(270, 55%, 55%)",
};

export function gestaoColor(g: string) {
  if (GESTAO_COLORS[g]) return GESTAO_COLORS[g];
  // gera cor determinística para G5, G6...
  const num = parseInt(g.replace("G", "")) || 0;
  const hue = (num * 67) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function labelGestao(g: string) {
  if (gestaoLabel[g]) return gestaoLabel[g];
  const m = g.match(/^G(\d+)$/);
  return m ? `Gestão ${m[1]}` : g;
}

// ─── Tempo relativo ─────────────────────────────────────────────────────────

export function tempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}
