-- Índices de busca por texto (ilike '%termo%') nas colunas usadas pelas telas.
-- Cria SOMENTE os que ainda não existem (confere pelas definições em pg_indexes) e atualiza as estatísticas.
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf). Pode levar alguns segundos em clientes/contatos.
create extension if not exists pg_trgm;

do $$
declare
  alvo record;
  existe boolean;
  nome_idx text;
begin
  for alvo in
    select * from (values
      ('clientes',     'nome_fantasia'),
      ('clientes',     'razao_social'),
      ('clientes',     'cidade'),
      ('clientes',     'cnpj'),
      ('contatos',     'nome'),
      ('contatos',     'email'),
      ('contatos',     'cargo'),
      ('fornecedores', 'nome_fantasia'),
      ('fornecedores', 'razao_social'),
      ('fornecedores', 'cnpj'),
      ('fornecedores', 'codigo'),
      ('empresas',     'razao_social'),
      ('empresas',     'nome_fantasia'),
      ('empresas',     'cnpj')
    ) as t(tabela, coluna)
  loop
    -- pula se a tabela/coluna não existir
    continue when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = alvo.tabela and column_name = alvo.coluna);

    select exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = alvo.tabela
        and indexdef ilike '%gin%' and indexdef ilike '%gin_trgm_ops%'
        and indexdef ~* ('\(\s*"?' || alvo.coluna || '"?\s+gin_trgm_ops')
    ) into existe;

    if not existe then
      nome_idx := 'idx_' || alvo.tabela || '_' || alvo.coluna || '_trgm';
      execute format('create index if not exists %I on public.%I using gin (%I gin_trgm_ops)', nome_idx, alvo.tabela, alvo.coluna);
      raise notice 'criado: %', nome_idx;
    end if;
  end loop;
end $$;

analyze public.clientes;
analyze public.contatos;
analyze public.fornecedores;

-- Resultado: colunas que agora têm índice de texto
select tablename, substring(indexdef from '\(([^)]*)\)\s*$') as coluna, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('clientes', 'contatos', 'fornecedores', 'empresas')
  and indexdef ilike '%gin_trgm_ops%'
order by tablename, coluna;
