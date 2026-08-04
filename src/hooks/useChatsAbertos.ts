import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"

/**
 * Conta chats ativos/pausados onde a ÚLTIMA mensagem é do cliente E ainda não foi lida.
 * Badge some automaticamente quando o gestor abre e lê a conversa (lida → true).
 */
export function useChatsAbertos() {
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(async () => {
    const { data: chats } = await supabase
      .from("chats")
      .select("id")
      .in("status", ["ativo", "pausado"])

    if (!chats || chats.length === 0) {
      setTotal(0)
      return
    }

    const resultados = await Promise.all(
      chats.map(async (chat) => {
        const { data } = await supabase
          .from("mensagens")
          .select("origem, lida")
          .eq("chat_id", chat.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle()
        // Conta apenas se a última mensagem é do cliente E ainda não foi lida
        return data?.origem === "cliente" && data?.lida === false ? 1 : 0
      })
    )

    setTotal(resultados.reduce((acc, v) => acc + v, 0))
  }, [])

  // Esse hook roda em TODA aba aberta (mora na sidebar) e escuta TODA
  // mensagem/chat do sistema inteiro — sem debounce, uma rajada de eventos
  // (comum com tráfego real de WhatsApp) disparava uma consulta N+1 (1 +
  // qtd. de chats ativos) por evento. Agrupa a rajada numa consulta só.
  // Adicionado em 2026-08-04 por causa de estouro de egress no Supabase
  // (free tier) — ver [[incidente_egress_supabase_2026-08-04]].
  const buscarDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(buscar, 2000)
  }, [buscar])

  useEffect(() => {
    buscar()

    const canal = supabase
      .channel("sidebar-sem-resposta")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, () => {
        buscarDebounced()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mensagens" }, () => {
        buscarDebounced()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        buscarDebounced()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscar, buscarDebounced])

  return total
}
