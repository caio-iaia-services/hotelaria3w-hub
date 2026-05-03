import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

/**
 * Conta chats ativos/pausados cuja ÚLTIMA mensagem é do cliente
 * (ou seja, conversas que ainda aguardam resposta).
 *
 * Não depende da flag `lida` — usa a origem da última mensagem como
 * fonte de verdade, igual ao critério usado em carregarChats/Atendimento.
 */
export function useChatsAbertos() {
  const [total, setTotal] = useState(0)

  async function buscar() {
    // 1. Busca todos os chats ativos/pausados
    const { data: chats } = await supabase
      .from("chats")
      .select("id")
      .in("status", ["ativo", "pausado"])

    if (!chats || chats.length === 0) {
      setTotal(0)
      return
    }

    // 2. Para cada chat, verifica se a última mensagem é do cliente
    const resultados = await Promise.all(
      chats.map(async (chat) => {
        const { data } = await supabase
          .from("mensagens")
          .select("origem")
          .eq("chat_id", chat.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle()
        return data?.origem === "cliente" ? 1 : 0
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
