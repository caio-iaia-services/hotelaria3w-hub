-- Funções de apoio pra popular os filtros avançados de campanha (Segmento,
-- Estado) na tela Nova Campanha do Marketing → WhatsApp.
--
-- IMPORTANTE: `clientes` tem ~236 mil linhas (base Receita Federal, ver
-- [[modulo-buscar-empresas]]). Buscar os valores distintos direto do
-- frontend (select segmento, estado from clientes) traria a tabela
-- inteira pro navegador — o mesmo padrão que já causou o incidente de
-- egress documentado em [[incidente-egress-supabase-2026-08-04]]. Essas
-- funções calculam a lista pequena de valores distintos DENTRO do banco e
-- devolvem só isso.

create or replace function public.listar_segmentos_clientes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct s order by s), '{}')
  from clientes, unnest(segmento) as s
  where s is not null and s <> '';
$$;

create or replace function public.listar_estados_clientes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct estado order by estado), '{}')
  from clientes
  where estado is not null and estado <> '';
$$;

revoke all on function public.listar_segmentos_clientes() from public, anon;
revoke all on function public.listar_estados_clientes() from public, anon;
grant execute on function public.listar_segmentos_clientes() to authenticated;
grant execute on function public.listar_estados_clientes() to authenticated;
