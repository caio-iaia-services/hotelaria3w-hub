-- Campos internos do item de orçamento Castor (não aparecem na proposta ao cliente).
-- Permitem reabrir o orçamento na edição com tabela, preço de referência, desconto e acréscimo.
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).
alter table public.orcamento_itens
  add column if not exists tabela           text,
  add column if not exists preco_referencia numeric,
  add column if not exists desconto_pct     numeric,
  add column if not exists acrescimo_pct    numeric;
