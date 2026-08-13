import { gestaoLabel } from "@/lib/userProfile";

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
  rejeitado: "hsl(0, 72%, 55%)",
  expirado: "hsl(25, 90%, 55%)",
};

export const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  expirado: "Expirado",
};

export const statusBadgeClass: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600 border-gray-200",
  enviado: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
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
