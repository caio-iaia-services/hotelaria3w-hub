import { useState, useEffect } from "react"

// Cache em memória para não repetir chamadas durante a sessão
const cache: Record<string, string[]> = {}

export function useCidadesIBGE(uf: string | null | undefined) {
  const [cidades, setCidades] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uf) { setCidades([]); return }

    // Retorna do cache se já buscado
    if (cache[uf]) { setCidades(cache[uf]); return }

    setLoading(true)
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    )
      .then((r) => r.json())
      .then((data: { nome: string }[]) => {
        const nomes = data.map((m) => m.nome)
        cache[uf] = nomes
        setCidades(nomes)
      })
      .catch(() => setCidades([]))
      .finally(() => setLoading(false))
  }, [uf])

  return { cidades, loading }
}
