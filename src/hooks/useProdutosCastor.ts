import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MedidaPreco {
  medida: string
  preco: number
}

export interface ProdutoCastor {
  id: string
  codigo: string
  descricao: string
  especificacao: string
  linha: string
  altura: number
  medidas_precos: MedidaPreco[]
  medidas_disponiveis: string[]
}

export function useProdutosCastorBusca(termo: string, campo: 'codigo' | 'descricao', habilitado: boolean = true) {
  const [resultados, setResultados] = useState<ProdutoCastor[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = termo.trim()
    if (!habilitado || trimmed.length < 2) {
      setResultados([])
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        let query = supabase.from('produtos_castor_view').select('*')

        if (campo === 'codigo') {
          query = query.ilike('codigo', `%${trimmed}%`)
        } else {
          query = query.or(`descricao.ilike.%${trimmed}%,especificacao.ilike.%${trimmed}%`)
        }

        const { data, error } = await query.limit(10)
        console.log(`[ProdutosCastor] busca "${trimmed}" por ${campo}:`, { data, error })
        if (error) {
          console.warn('Erro busca produtos_castor_view:', error)
          setResultados([])
        } else {
          setResultados((data || []) as ProdutoCastor[])
        }
      } catch (err) {
        console.warn('Erro busca produtos:', err)
        setResultados([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [termo, campo, habilitado])

  return { resultados, loading }
}
