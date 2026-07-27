import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tarefa } from '@/lib/types'

export interface UsuarioAtivo {
  id: string
  nome: string
  gestao: string | null
}

export interface OportunidadeAberta {
  id: string
  numero: string
  operacao: string
  cliente_id: string
  cliente_nome: string
}

const SELECT_TAREFA = `
  id, titulo, responsavel_id, criado_por, oportunidade_id, cliente_id, cliente_nome,
  data, hora, concluida, concluida_em, created_at, updated_at,
  responsavel:user_profiles!tarefas_responsavel_id_fkey(id, nome),
  criador:user_profiles!tarefas_criado_por_fkey(id, nome),
  oportunidade:oportunidades(id, numero)
`

export interface NovaTarefaPayload {
  titulo: string
  responsavel_id: string
  criado_por: string
  oportunidade_id?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  data?: string | null
  hora?: string | null
}

export interface EditarTarefaPayload {
  titulo?: string
  responsavel_id?: string
  oportunidade_id?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  data?: string | null
  hora?: string | null
}

// Mutações "cruas" — sem estado, usadas tanto pelo hook useTarefas() (que
// recarrega a lista própria depois) quanto pelo NovaTarefaModal (que só
// dispara onSalvo pro consumidor recarregar a lista dele).
export async function criarTarefa(payload: NovaTarefaPayload) {
  const { error } = await supabase.from('tarefas').insert(payload)
  if (error) throw error
}

export async function atualizarTarefa(id: string, payload: EditarTarefaPayload) {
  const { error } = await supabase
    .from('tarefas')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function concluirTarefa(id: string, concluida: boolean) {
  const { error } = await supabase
    .from('tarefas')
    .update({
      concluida,
      concluida_em: concluida ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deletarTarefa(id: string) {
  const { error } = await supabase.from('tarefas').delete().eq('id', id)
  if (error) throw error
}

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  const buscar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tarefas')
      .select(SELECT_TAREFA)
      .order('data', { ascending: true, nullsFirst: false })
      .order('hora', { ascending: true, nullsFirst: false })

    if (error) {
      console.warn('Erro ao buscar tarefas:', error)
      setTarefas([])
    } else {
      setTarefas((data || []) as unknown as Tarefa[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    buscar()
  }, [buscar])

  return {
    tarefas,
    loading,
    recarregar: buscar,
    criarTarefa: async (payload: NovaTarefaPayload) => { await criarTarefa(payload); await buscar() },
    atualizarTarefa: async (id: string, payload: EditarTarefaPayload) => { await atualizarTarefa(id, payload); await buscar() },
    concluirTarefa: async (id: string, concluida: boolean) => { await concluirTarefa(id, concluida); await buscar() },
    deletarTarefa: async (id: string) => { await deletarTarefa(id); await buscar() },
  }
}

export function useUsuariosAtivos() {
  const [usuarios, setUsuarios] = useState<UsuarioAtivo[]>([])

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, nome, gestao')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (error) {
          console.warn('Erro ao buscar usuários ativos:', error)
          return
        }
        setUsuarios((data || []) as UsuarioAtivo[])
      })
  }, [])

  return usuarios
}

// Oportunidades abertas do gestor (gestao do responsável selecionado) — mesmo
// padrão de filtro usado em Oportunidades.tsx.
export async function buscarOportunidadesAbertasPorGestao(gestao: string | null | undefined): Promise<OportunidadeAberta[]> {
  if (!gestao) return []

  const { data, error } = await supabase
    .from('oportunidades')
    .select('id, numero, operacao, cliente_id, cliente:clientes!oportunidades_cliente_id_fkey(nome_fantasia)')
    .eq('status', 'em_andamento')
    .ilike('gestao', `%${gestao}%`)
    .order('numero')

  if (error) {
    console.warn('Erro ao buscar oportunidades abertas:', error)
    return []
  }

  return (data || []).map((o) => ({
    id: o.id,
    numero: o.numero,
    operacao: o.operacao,
    cliente_id: o.cliente_id as string,
    cliente_nome: (o.cliente as unknown as { nome_fantasia: string } | null)?.nome_fantasia || '',
  }))
}

// Tarefas linkadas a uma oportunidade específica — usado no CRM (PipelineCardModal).
export async function buscarTarefasDaOportunidade(oportunidadeId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(SELECT_TAREFA)
    .eq('oportunidade_id', oportunidadeId)
    .order('concluida', { ascending: true })
    .order('data', { ascending: true, nullsFirst: false })

  if (error) {
    console.warn('Erro ao buscar tarefas da oportunidade:', error)
    return []
  }
  return (data || []) as unknown as Tarefa[]
}
