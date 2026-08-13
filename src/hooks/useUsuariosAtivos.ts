import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface UsuarioAtivo {
  id: string;
  nome: string;
}

/**
 * Usuários ativos do sistema (user_profiles.ativo = true) — usados no filtro
 * Responsável de Contatos e no seletor de Responsável do ContatoModal. Mesmo
 * padrão do useCanaisMarketingAtivos: opções vêm direto da tabela, então um
 * usuário novo (ou desativado) já reflete aqui sem precisar tocar em código.
 */
export function useUsuariosAtivos() {
  const [usuarios, setUsuarios] = useState<UsuarioAtivo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from("user_profiles")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data, error }) => {
        if (!error) setUsuarios(data || []);
        setCarregando(false);
      });
  }, []);

  return { usuarios, carregando };
}
