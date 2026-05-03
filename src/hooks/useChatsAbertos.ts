import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

/**
 * Conta chats ativos/pausados onde a ÚLTIMA mensagem é do cliente E ainda não foi lida.
 * Badge some automaticamente quando o gestor abre e lê a conversa (lida → true).
 */
export function useChatsAbertos() {
  const [total, setTotal] = useState(0)

  async function buscar() {
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
  }

  useEffect(() => {
    buscar()

    const canal = supabase
      .channel("sidebar-sem-resposta")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, () => {
        buscar()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mensagens" }, () => {
        buscar()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        buscar()
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  return total
}
