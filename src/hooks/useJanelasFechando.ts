import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

/**
 * Alerta pop-up app-wide: avisa o gestor quando a janela de 24h de uma
 * conversa ativa (Meta Cloud API — mensagem livre só até 24h após a última
 * mensagem do CLIENTE) está prestes a fechar, em 60/30/15min. Roda no
 * AppLayout, então funciona em qualquer tela do hub, não só em /atendimento.
 *
 * Mesmo padrão poll + Realtime de useSolicitacoesPendentes/useChatsAbertos,
 * mas aqui só poll (janela fecha por TEMPO, não por evento no banco — não tem
 * o que escutar via Realtime). Intervalo deliberadamente conservador — ver
 * incidente de egress 2026-08-04 (polling agressivo no Atendimento estourou
 * o free tier do Supabase e derrubou o sistema por ~4 dias).
 */

const LIMIARES_MIN = [60, 30, 15] as const;
const POLL_MS = 2 * 60 * 1000; // 2 min — suficiente pra não perder os limiares de 15min
const STORAGE_KEY = "3w_janelas_notificadas_v1";

// Nomes de exibição por canal — mesmos gestores do painel em Atendimento.tsx
// (duplicado aqui de propósito: importar de Atendimento.tsx puxaria a página
// inteira pro bundle inicial do AppLayout).
const NOME_CANAL: Record<string, string> = { G1: "Fabiano", G4: "Alex", ADM: "Celso", IA: "Recepção" };

interface LinhaJanela {
  chat_id: string;
  canal: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  ultima_msg_cliente: string;
}

function chaveNotificacao(chatId: string, ultimaMsg: string, limiar: number) {
  return `${chatId}:${ultimaMsg}:${limiar}`;
}

function carregarNotificados(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function salvarNotificados(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage indisponível (modo privado etc.) — degrada pra "sem memória entre sessões", não quebra o resto
  }
}

export function useJanelasFechando() {
  const { perfil, isAdmin, gestaoFiltro, temModulo } = useAuth();
  const navigate = useNavigate();
  const notificadosRef = useRef<Set<string>>(carregarNotificados());

  const canaisVisiveis = useCallback((): string[] | null => {
    if (isAdmin) return null; // null = sem filtro, vê tudo
    if (gestaoFiltro) return [gestaoFiltro];
    return [];
  }, [isAdmin, gestaoFiltro]);

  useEffect(() => {
    if (!perfil || !temModulo("atendimento")) return;
    let cancelado = false;

    async function checar() {
      const canais = canaisVisiveis();
      if (canais && canais.length === 0) return;

      let query = supabase.from("v_janela_chats_ativos").select("*");
      if (canais) query = query.in("canal", canais);
      const { data, error } = await query;
      if (error) {
        console.warn("Erro ao checar janelas de atendimento:", error);
        return;
      }
      if (cancelado || !data) return;

      const linhas = data as LinhaJanela[];
      const idsAtivos = new Set(linhas.map(l => l.chat_id));
      const agora = Date.now();
      let mudou = false;

      for (const linha of linhas) {
        const minutosRestantes =
          24 * 60 - (agora - new Date(linha.ultima_msg_cliente).getTime()) / 60_000;
        if (minutosRestantes <= 0) continue; // já fechou — fora do escopo deste alerta

        const cruzados = LIMIARES_MIN.filter(l => minutosRestantes <= l);
        const naoNotificados = cruzados.filter(
          l => !notificadosRef.current.has(chaveNotificacao(linha.chat_id, linha.ultima_msg_cliente, l))
        );
        if (naoNotificados.length === 0) continue;

        // Marca todos os limiares já ultrapassados como vistos (evita re-notificar
        // os "60min"/"30min" se o usuário só abriu o hub depois, com a janela já
        // em 10min) — mas só dispara o toast pro limiar mais urgente entre os novos.
        cruzados.forEach(l =>
          notificadosRef.current.add(chaveNotificacao(linha.chat_id, linha.ultima_msg_cliente, l))
        );
        mudou = true;
        const limiarUrgente = Math.min(...naoNotificados);

        const quem = linha.contato_nome || linha.contato_telefone || "cliente";
        const gestorNome = NOME_CANAL[linha.canal] ?? linha.canal;
        toast.warning("Janela de atendimento fechando", {
          description: `Conversa com ${quem} (${gestorNome}) fecha em ${limiarUrgente}min. Depois disso só é possível responder com template.`,
          duration: 20_000,
          action: { label: "Ver Atendimento", onClick: () => navigate("/atendimento") },
        });
      }

      // Poda: descarta do cache qualquer chave de chat que não está mais na
      // lista ativa (encerrado, ou passou das 25h) — mantém o localStorage pequeno.
      for (const chave of notificadosRef.current) {
        const chatId = chave.split(":")[0];
        if (!idsAtivos.has(chatId)) {
          notificadosRef.current.delete(chave);
          mudou = true;
        }
      }
      if (mudou) salvarNotificados(notificadosRef.current);
    }

    checar();
    const interval = setInterval(checar, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [perfil, temModulo, canaisVisiveis, navigate]);
}
