import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface TabelaCastorRegistro {
  codigo: string
  nome_arquivo: string | null
  arquivo_url: string | null
  total_produtos: number | null
  total_precos: number | null
  novos_produtos: number | null
  importado_em: string | null
}

const FALLBACK = ['5140']

/** Tabelas de preço Castor importadas (mais recente primeiro). Sem registro/permite leitura → só a 5140. */
export function useTabelasCastor(habilitado: boolean = true) {
  const [registros, setRegistros] = useState<TabelaCastorRegistro[]>([])
  const [tabelas, setTabelas] = useState<string[]>(FALLBACK)

  const carregar = useCallback(async () => {
    if (!habilitado) return
    try {
      const { data, error } = await (supabase as any)
        .from('tabelas_castor')
        .select('codigo, nome_arquivo, arquivo_url, total_produtos, total_precos, novos_produtos, importado_em')
        .order('codigo', { ascending: false })
      if (error || !data || data.length === 0) return
      setRegistros(data as TabelaCastorRegistro[])
      setTabelas((data as TabelaCastorRegistro[]).map(r => r.codigo))
    } catch {
      /* mantém o fallback */
    }
  }, [habilitado])

  useEffect(() => { carregar() }, [carregar])

  return { tabelas, registros, recarregar: carregar }
}
