-- Inscrição Estadual (obrigatória nos orçamentos Castor) e DIFAL por item (campos internos, não vão ao cliente).
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).
alter table public.orcamentos
  add column if not exists inscricao_estadual_ativa boolean;

alter table public.orcamento_itens
  add column if not exists percentual_difal      numeric,
  add column if not exists preco_unitario_difal  numeric;
