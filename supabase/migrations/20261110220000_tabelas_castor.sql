-- Tabelas de preço Castor (nº de referência de 4 dígitos, ex.: 5140) + importação via upload na tela de Fornecedores.
-- Rodar uma vez no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).

-- 1) Registro das tabelas importadas (alimenta o dropdown "Tabela" do orçamento Castor)
create table if not exists public.tabelas_castor (
  codigo          text primary key check (codigo ~ '^[0-9]{4}$'),
  nome_arquivo    text,
  arquivo_url     text,
  total_produtos  integer,
  total_precos    integer,
  novos_produtos  integer,
  importado_por   uuid,
  importado_em    timestamptz not null default now()
);

alter table public.tabelas_castor enable row level security;

drop policy if exists tabelas_castor_select on public.tabelas_castor;
create policy tabelas_castor_select on public.tabelas_castor
  for select to authenticated using (true);
-- Sem policy de insert/update/delete: a escrita só acontece pela função abaixo.

grant select on public.tabelas_castor to authenticated;

-- Tabela 5140 já importada manualmente em 10/11/2026
insert into public.tabelas_castor (codigo, nome_arquivo, total_produtos, total_precos, novos_produtos)
values ('5140', '5140 atacado 07.10.2026.pdf', 309, 2460, 42)
on conflict (codigo) do nothing;

-- 2) Importação atômica: atualiza catálogo e preços e registra a tabela.
--    p_itens = [{codigo, descricao, especificacao, altura, linha, precos:[{medida, preco}]}]
create or replace function public.importar_tabela_castor(
  p_codigo        text,
  p_nome_arquivo  text,
  p_arquivo_url   text,
  p_itens         jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novos        integer := 0;
  v_esp          integer := 0;
  v_precos_upd   integer := 0;
  v_precos_ins   integer := 0;
  v_produtos     integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if not (public.is_admin() or public.tem_modulo('fornecedores')) then
    raise exception 'Sem permissão para importar tabela de fornecedor';
  end if;
  if p_codigo is null or p_codigo !~ '^[0-9]{4}$' then
    raise exception 'Código de tabela inválido (esperado 4 dígitos)';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhum item para importar';
  end if;

  create temporary table _it on commit drop as
    select i->>'codigo'                         as codigo,
           coalesce(i->>'descricao', '')        as descricao,
           coalesce(i->>'especificacao', '')    as especificacao,
           nullif(i->>'altura', '')::numeric    as altura,
           coalesce(i->>'linha', '')            as linha,
           i->'precos'                          as precos
      from jsonb_array_elements(p_itens) i;

  create temporary table _pr on commit drop as
    select it.codigo, x->>'medida' as medida, (x->>'preco')::numeric as preco
      from _it it, jsonb_array_elements(it.precos) x
     where x->>'medida' is not null and (x->>'preco') is not null;

  select count(*) into v_produtos from _it;

  -- produtos novos
  insert into produtos_castor (codigo, descricao, especificacao, altura, linha)
  select it.codigo, it.descricao, it.especificacao, it.altura, it.linha
    from _it it
   where not exists (select 1 from produtos_castor p where p.codigo = it.codigo);
  get diagnostics v_novos = row_count;

  -- especificações renomeadas pela Castor
  update produtos_castor p
     set especificacao = it.especificacao, updated_at = now()
    from _it it
   where p.codigo = it.codigo
     and it.especificacao <> ''
     and p.especificacao is distinct from it.especificacao;
  get diagnostics v_esp = row_count;

  -- preços existentes
  update produtos_castor_precos p
     set preco = v.preco
    from _pr v
   where p.produto_codigo = v.codigo and p.medida = v.medida
     and p.preco is distinct from v.preco;
  get diagnostics v_precos_upd = row_count;

  -- combinações código/medida novas
  insert into produtos_castor_precos (produto_codigo, medida, preco)
  select v.codigo, v.medida, v.preco
    from _pr v
   where not exists (
     select 1 from produtos_castor_precos p
      where p.produto_codigo = v.codigo and p.medida = v.medida);
  get diagnostics v_precos_ins = row_count;

  insert into tabelas_castor (codigo, nome_arquivo, arquivo_url, total_produtos, total_precos, novos_produtos, importado_por, importado_em)
  values (p_codigo, p_nome_arquivo, p_arquivo_url, v_produtos, (select count(*) from _pr), v_novos, auth.uid(), now())
  on conflict (codigo) do update
    set nome_arquivo   = excluded.nome_arquivo,
        arquivo_url    = excluded.arquivo_url,
        total_produtos = excluded.total_produtos,
        total_precos   = excluded.total_precos,
        novos_produtos = excluded.novos_produtos,
        importado_por  = excluded.importado_por,
        importado_em   = excluded.importado_em;

  return jsonb_build_object(
    'produtos',           v_produtos,
    'produtos_novos',     v_novos,
    'especificacoes',     v_esp,
    'precos_atualizados', v_precos_upd,
    'precos_novos',       v_precos_ins
  );
end;
$$;

revoke all on function public.importar_tabela_castor(text, text, text, jsonb) from public, anon;
grant execute on function public.importar_tabela_castor(text, text, text, jsonb) to authenticated;
