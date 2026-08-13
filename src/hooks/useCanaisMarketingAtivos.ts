import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CanalMarketingAtivo {
  id: string;
  nome: string;
}

/**
 * Canais de marketing ativos (marketing_midias.ativo = true) — usados no filtro
 * Canal de Contatos e no seletor de Canal do ContatoModal. Habilitar/desabilitar
 * um canal em Configurações → Marketing (AdminMarketing.tsx) reflete aqui
 * automaticamente, sem precisar tocar em código.
 */
export function useCanaisMarketingAtivos() {
  const [canais, setCanais] = useState<CanalMarketingAtivo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from("marketing_midias")
      .select("id, nome")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data, error }) => {
        if (!error) setCanais(data || []);
        setCarregando(false);
      });
  }, []);

  return { canais, carregando };
}
