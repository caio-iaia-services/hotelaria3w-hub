import { supabase } from "@/lib/supabase";

export interface ChatSemResposta {
  id: string;
  canal: string;
  ultima_mensagem_em: string;
  contato: { nome: string | null; telefone: string | null } | null;
}

/**
 * Chats ativos cuja última mensagem foi do cliente (ainda não respondida)
 * há mais de `minMinutosParado` minutos.
 *
 * Estratégia em 2 passos pra não escanear a tabela `mensagens` inteira
 * (44 mil+ linhas): primeiro filtra candidatos pelo `chats.ultima_mensagem_em`
 * (coluna já denormalizada), depois busca só a mensagem mais recente
 * desses candidatos pra confirmar quem mandou por último.
 */
export async function buscarChatsSemResposta(
  canalFiltro?: string | null,
  minMinutosParado = 5,
  limite = 50
): Promise<ChatSemResposta[]> {
  const limiar = new Date(Date.now() - minMinutosParado * 60_000).toISOString();

  let q = supabase
    .from("chats")
    .select("id, canal, ultima_mensagem_em, contato:contatos_whatsapp(nome, telefone)")
    .eq("status", "ativo")
    .lt("ultima_mensagem_em", limiar)
    .order("ultima_mensagem_em", { ascending: true })
    .limit(300);
  if (canalFiltro) q = q.eq("canal", canalFiltro);

  const { data: candidatos, error } = await q;
  if (error) { console.error("buscarChatsSemResposta (candidatos):", error); return []; }
  const lista = (candidatos || []) as unknown as ChatSemResposta[];
  if (lista.length === 0) return [];

  const ids = lista.map(c => c.id);
  const { data: msgs, error: erroMsgs } = await supabase
    .from("mensagens")
    .select("chat_id, origem, criado_em")
    .in("chat_id", ids)
    .order("criado_em", { ascending: false });
  if (erroMsgs) { console.error("buscarChatsSemResposta (mensagens):", erroMsgs); return []; }

  const ultimaOrigemPorChat = new Map<string, string>();
  for (const m of (msgs || []) as { chat_id: string; origem: string }[]) {
    if (!ultimaOrigemPorChat.has(m.chat_id)) ultimaOrigemPorChat.set(m.chat_id, m.origem);
  }

  return lista
    .filter(c => ultimaOrigemPorChat.get(c.id) === "cliente")
    .slice(0, limite);
}

export interface ResumoCanal {
  canal: string;
  ativas: number;
}

/** Conversas ativas agrupadas por canal — pra visão consolidada do admin. */
export async function buscarResumoAtendimentoPorCanal(): Promise<{ total: number; porCanal: ResumoCanal[] }> {
  const { data, error } = await supabase.from("chats").select("canal").eq("status", "ativo").limit(5000);
  if (error) { console.error("buscarResumoAtendimentoPorCanal:", error); return { total: 0, porCanal: [] }; }
  const contagem: Record<string, number> = {};
  (data || []).forEach((c: { canal: string | null }) => {
    const canal = c.canal || "—";
    contagem[canal] = (contagem[canal] || 0) + 1;
  });
  const porCanal = Object.entries(contagem)
    .map(([canal, ativas]) => ({ canal, ativas }))
    .sort((a, b) => b.ativas - a.ativas);
  return { total: data?.length || 0, porCanal };
}

export function minutosParaTexto(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const restoMin = min % 60;
  if (h < 24) return restoMin > 0 ? `${h}h${restoMin}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export const CANAL_LABEL: Record<string, string> = {
  IA: "Recepção (IA)",
  ADM: "Celso (Adm)",
  FORNECEDORES: "Fornecedores",
};

export function labelCanal(canal: string, labelGestaoFn: (g: string) => string) {
  if (CANAL_LABEL[canal]) return CANAL_LABEL[canal];
  if (/^G\d+$/.test(canal)) return labelGestaoFn(canal);
  return canal;
}
