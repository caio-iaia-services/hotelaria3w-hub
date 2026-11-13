-- Ordenação numérica dos orçamentos (o campo "numero" é texto: "9999" aparecia acima de "0012912").
-- Coluna gerada e somente leitura; números não numéricos ficam com valor nulo (vão para o fim).
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).
alter table public.orcamentos
  add column if not exists numero_ordem bigint
  generated always as (case when numero ~ '^[0-9]{1,15}$' then numero::bigint end) stored;

create index if not exists idx_orcamentos_numero_ordem
  on public.orcamentos (numero_ordem desc nulls last, created_at desc);
