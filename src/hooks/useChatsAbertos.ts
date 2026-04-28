import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

/**
 * Conta chats com status 'ativo' ou 'pausado' em tempo real.
 * Usado na sidebar para exibir o indicador de conversas abertas.
 */
export function useChatsAbertos() {
  const [total, setTotal] = useState(0)

  async function buscar() {
    const { count } = await supabase
      .from("chats")
      .select("id", { count: "exact", head: true })
      .in("status", ["ativo", "pausado"])
    setTotal(count ?? 0)
  }

  useEffect(() => {
    buscar()

    const canal = supabase
      .channel("sidebar-chats-abertos")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        buscar()
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  return total
}
