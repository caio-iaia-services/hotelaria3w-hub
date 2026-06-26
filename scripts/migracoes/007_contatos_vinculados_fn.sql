-- Funcao para o card de metrica "Vinculados a Empresas" em Contatos
-- Executar no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.contar_contatos_vinculados()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(DISTINCT contato_id) FROM public.contato_cliente;
$$;

GRANT EXECUTE ON FUNCTION public.contar_contatos_vinculados() TO authenticated;
