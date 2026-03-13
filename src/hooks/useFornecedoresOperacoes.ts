import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface FornecedorOperacao {
  nome_fantasia: string;
  gestao: string;
}

/**
 * Hook que busca fornecedores ativos com gestão cadastrada
 * e retorna as operações agrupadas por gestão (G1, G2, G3).
 * Cada fornecedor = uma operação.
 */
export function useFornecedoresOperacoes(enabled = true) {
  const [fornecedores, setFornecedores] = useState<FornecedorOperacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    supabase
      .from("fornecedores")
      .select("nome_fantasia, gestao")
      .not("gestao", "is", null)
      .neq("gestao", "")
      .in("status", ["ativo", "prospecção"])
      .order("nome_fantasia", { ascending: true })
      .then(({ data }) => {
        setFornecedores(data || []);
        setLoading(false);
      });
  }, [enabled]);

  const gestaoOperacoes = useMemo(() => {
    const map: Record<string, string[]> = { G1: [], G2: [], G3: [], G4: [] };
    for (const f of fornecedores) {
      // gestao pode ser "G1", "G1, G2", etc.
      const gestoes = f.gestao.split(",").map(g => g.trim()).filter(Boolean);
      for (const g of gestoes) {
        const key = g.startsWith("G") ? g : `G${g}`;
        if (!map[key]) map[key] = [];
        if (!map[key].includes(f.nome_fantasia)) {
          map[key].push(f.nome_fantasia);
        }
      }
    }
    return map;
  }, [fornecedores]);

  const todasOperacoes = useMemo(() => Object.values(gestaoOperacoes).flat(), [gestaoOperacoes]);

  const operacaoGestaoLabel = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [gestao, ops] of Object.entries(gestaoOperacoes)) {
      for (const op of ops) m[op] = gestao;
    }
    return m;
  }, [gestaoOperacoes]);

  return { gestaoOperacoes, todasOperacoes, operacaoGestaoLabel, loading };
}
