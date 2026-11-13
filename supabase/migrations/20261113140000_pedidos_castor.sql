-- Módulo de Pedidos (Castor). Um pedido nasce sempre de um orçamento (1 pedido por orçamento).
-- Percentuais são gravados em "pontos percentuais" (31 = 31%), como em orcamento_itens.desconto_pct.
-- Rodar uma vez no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).

create table if not exists public.pedidos_castor (
  id                    uuid primary key default gen_random_uuid(),
  orcamento_id          uuid not null unique references public.orcamentos(id) on delete restrict,
  cliente_id            uuid,
  fornecedor_id         uuid,
  gestao                text,
  status                text not null default 'rascunho',

  -- cabeçalho do formulário Castor
  numero                text not null,
  data_pedido           date not null default current_date,
  vend_repres           text not null default '463',
  cliente_numero        text,
  tpop                  text,
  tabela                text,
  cod_mensagens         text,
  codigo_fat            text,

  -- cliente
  razao_social          text,
  endereco              text,
  bairro                text,
  cidade                text,
  estado                text,
  cep                   text,
  fone                  text,
  end_cobranca          text,
  cnpj                  text,
  inscricao_estadual    text,

  -- local de entrega
  entrega_endereco      text,
  entrega_cnpj          text,
  entrega_ie            text,
  entrega_cidade        text,
  entrega_estado        text,
  entrega_cep           text,

  condicoes_pagamento   text,
  prazo_entrega         text,
  observacoes           text,

  -- rodapé
  total_pedido          numeric not null default 0,   -- soma sem descontos
  desconto_itens        numeric not null default 0,   -- desconto 1+2+3 aplicados nos itens
  desconto_adicional    numeric not null default 0,   -- 2º campo "Desconto" (R$, manual)
  ipi                   numeric not null default 0,   -- R$, manual
  acrescimo_fin_pct     numeric not null default 0,
  total                 numeric not null default 0,

  criado_por            uuid default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.pedidos_castor_itens (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references public.pedidos_castor(id) on delete cascade,
  ordem             integer not null default 0,
  codigo            text,
  descricao         text,
  quantidade        numeric not null default 1,
  preco_unitario    numeric not null default 0,   -- referência + acréscimo do estado
  desconto1_pct     numeric not null default 0,   -- desconto do estado
  desconto2_pct     numeric not null default 0,
  desconto3_pct     numeric not null default 0,
  preco_referencia  numeric,
  acrescimo_pct     numeric,
  total_sem_desc    numeric not null default 0,
  total             numeric not null default 0
);

create index if not exists pedidos_castor_itens_pedido_idx on public.pedidos_castor_itens (pedido_id, ordem);
create index if not exists pedidos_castor_created_idx on public.pedidos_castor (created_at desc);

create or replace function public.pedidos_castor_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pedidos_castor_touch on public.pedidos_castor;
create trigger pedidos_castor_touch before update on public.pedidos_castor
  for each row execute function public.pedidos_castor_touch();

-- RLS: mesmo público do módulo Orçamentos / Ações Comerciais
alter table public.pedidos_castor enable row level security;
alter table public.pedidos_castor_itens enable row level security;

drop policy if exists pedidos_castor_all on public.pedidos_castor;
create policy pedidos_castor_all on public.pedidos_castor
  for all to authenticated
  using (public.is_admin() or public.tem_modulo('orcamentos') or public.tem_modulo('acoes_comerciais'))
  with check (public.is_admin() or public.tem_modulo('orcamentos') or public.tem_modulo('acoes_comerciais'));

drop policy if exists pedidos_castor_itens_all on public.pedidos_castor_itens;
create policy pedidos_castor_itens_all on public.pedidos_castor_itens
  for all to authenticated
  using (public.is_admin() or public.tem_modulo('orcamentos') or public.tem_modulo('acoes_comerciais'))
  with check (public.is_admin() or public.tem_modulo('orcamentos') or public.tem_modulo('acoes_comerciais'));

grant select, insert, update, delete on public.pedidos_castor to authenticated;
grant select, insert, update, delete on public.pedidos_castor_itens to authenticated;

-- Garante a coluna de data de aprovação do orçamento (usada como "Data" do pedido)
alter table public.orcamentos add column if not exists aprovado_em timestamptz;
