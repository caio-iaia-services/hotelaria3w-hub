-- Destinatários do envio automático de pedidos no cadastro do fornecedor (sem limite de itens).
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).
alter table public.fornecedores
  add column if not exists pedido_emails    text[] not null default '{}',
  add column if not exists pedido_whatsapps text[] not null default '{}';
