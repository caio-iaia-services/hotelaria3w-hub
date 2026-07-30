import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface SolicitacaoPendenteItem {
  id: string
  tarefaId: string
  tarefaTitulo: string
  tipo: "exclusao" | "conclusao"
  motivo: string
  createdAt: string
  solicitanteNome: string
}

/**
 * Solicitações de exclusão/conclusão de tarefas pendentes de resposta do
 * usuário atual (ele é o criador da tarefa envolvida). Usado no sino do
 * cabeçalho e no badge do menu Agenda. Mesmo padrão poll + Realtime de
 * useChatsAbertos.ts.
 */
export function useSolicitacoesPendentes(userId: string | null | undefined) {
  const [itens, setItens] = useState<SolicitacaoPendenteItem[]>([])

  const buscar = useCallback(async () => {
    if (!userId) {
      setItens([])
      return
    }

    const { data, error } = await supabase
      .from("tarefa_solicitacoes")
      .select(`
        id, tipo, motivo, created_at, tarefa_id,
        tarefas!inner(titulo, criado_por),
        solicitante:user_profiles!tarefa_solicitacoes_solicitante_id_fkey(nome)
      `)
      .in("status", ["pendente", "aguardando_verificacao"])
      .eq("tarefas.criado_por", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Erro ao buscar solicitações pendentes:", error)
      return
    }

    setItens(
      (data || []).map((s) => ({
        id: s.id,
        tarefaId: s.tarefa_id,
        tarefaTitulo: (s.tarefas as unknown as { titulo: string })?.titulo || "",
        tipo: s.tipo as "exclusao" | "conclusao",
        motivo: s.motivo,
        createdAt: s.created_at,
        solicitanteNome: (s.solicitante as unknown as { nome: string } | null)?.nome || "",
      }))
    )
  }, [userId])

  useEffect(() => {
    buscar()

    const canal = supabase
      .channel("solicitacoes-pendentes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_solicitacoes" }, () => {
        buscar()
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [buscar])

  return { total: itens.length, itens }
}
