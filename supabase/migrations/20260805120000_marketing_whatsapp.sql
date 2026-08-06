-- Módulo Marketing → WhatsApp — fundação de compliance + campanhas
-- Reaproveita public.tem_modulo(text) e public.is_admin(), criadas em
-- 20260716180000_rls_hardening_fase1.sql. Visibilidade em nível de equipe
-- (igual tarefas), não por usuário (diferente de email_listas/email_campanhas)
-- porque campanha de WhatsApp compartilha reputação de UM número só — o time
-- inteiro precisa enxergar o que já foi disparado, não só quem criou.
--
-- IMPORTANTE (decisão do Caio em 2026-08-05): esta migration cria a ESTRUTURA
-- vazia. Nenhum contato é populado automaticamente em whatsapp_opt_in — a base
-- de opt-in legítima ainda depende de confirmação com o cliente (3W). Ver
-- memória modulo_marketing_whatsapp.md.

-- ─── Consentimento (opt-in/opt-out) por telefone × categoria ──────────────────
-- Chave é o telefone (não contato_id) porque a origem de um contato de
-- marketing pode ser contatos_whatsapp, clientes (CRM) ou uma captação nova —
-- não faz sentido prender consentimento a uma FK de uma base específica.
create table if not exists whatsapp_opt_in (
  id             uuid primary key default gen_random_uuid(),
  telefone       text not null,                 -- normalizado: só dígitos, com DDI 55
  nome           text,
  categoria      text not null default 'promocoes'
                   check (categoria in ('promocoes', 'novidades', 'avisos')),
  status         text not null default 'opt_in' check (status in ('opt_in', 'opt_out')),
  origem         text not null
                   check (origem in ('formulario_site', 'confirmacao_atendimento', 'importacao_manual_confirmada', 'outro')),
  observacao     text,                           -- ex.: onde/quando o consentimento foi coletado
  registrado_por uuid references public.user_profiles(id),
  registrado_em  timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (telefone, categoria)
);

create index if not exists idx_whatsapp_opt_in_telefone on whatsapp_opt_in(telefone);
create index if not exists idx_whatsapp_opt_in_status    on whatsapp_opt_in(status);

alter table whatsapp_opt_in enable row level security;

create policy "whatsapp_opt_in_select_modulo"
  on whatsapp_opt_in for select to authenticated
  using (public.tem_modulo('marketing'));

create policy "whatsapp_opt_in_insert_modulo"
  on whatsapp_opt_in for insert to authenticated
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_opt_in_update_modulo"
  on whatsapp_opt_in for update to authenticated
  using (public.tem_modulo('marketing'))
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_opt_in_delete_admin"
  on whatsapp_opt_in for delete to authenticated
  using (public.is_admin());

create trigger trg_whatsapp_opt_in_atualizado
  before update on whatsapp_opt_in
  for each row execute function update_atualizado_em();

-- ─── Listas de disparo ──────────────────────────────────────────────────────
create table if not exists whatsapp_listas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text,
  criado_por    uuid references public.user_profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table whatsapp_listas enable row level security;

create policy "whatsapp_listas_select_modulo"
  on whatsapp_listas for select to authenticated
  using (public.tem_modulo('marketing'));

create policy "whatsapp_listas_insert_modulo"
  on whatsapp_listas for insert to authenticated
  with check (public.tem_modulo('marketing') and criado_por = auth.uid());

create policy "whatsapp_listas_update_modulo"
  on whatsapp_listas for update to authenticated
  using (public.tem_modulo('marketing'))
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_listas_delete_criador_admin"
  on whatsapp_listas for delete to authenticated
  using (criado_por = auth.uid() or public.is_admin());

-- ─── Itens da lista ─────────────────────────────────────────────────────────
-- Trigger de proteção: só entra na lista quem tem opt_in ATIVO na categoria da
-- lista no momento da inserção. Não impede opt-out DEPOIS (a checagem real de
-- envio acontece de novo no endpoint de disparo, na hora de enviar).
create table if not exists whatsapp_lista_contatos (
  id         uuid primary key default gen_random_uuid(),
  lista_id   uuid not null references whatsapp_listas(id) on delete cascade,
  telefone   text not null,
  nome       text,
  added_at   timestamptz not null default now(),
  unique (lista_id, telefone)
);

create index if not exists idx_whatsapp_lista_contatos_lista on whatsapp_lista_contatos(lista_id);

create or replace function public.checar_opt_in_lista()
returns trigger as $$
begin
  if not exists (
    select 1 from whatsapp_opt_in
    where telefone = new.telefone and status = 'opt_in'
  ) then
    raise exception 'Telefone % não tem opt-in de marketing ativo — registre o consentimento antes de adicionar a uma lista.', new.telefone;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_whatsapp_lista_contatos_checa_opt_in
  before insert on whatsapp_lista_contatos
  for each row execute function public.checar_opt_in_lista();

alter table whatsapp_lista_contatos enable row level security;

create policy "whatsapp_lista_contatos_select_modulo"
  on whatsapp_lista_contatos for select to authenticated
  using (public.tem_modulo('marketing'));

create policy "whatsapp_lista_contatos_insert_modulo"
  on whatsapp_lista_contatos for insert to authenticated
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_lista_contatos_delete_modulo"
  on whatsapp_lista_contatos for delete to authenticated
  using (public.tem_modulo('marketing'));

-- ─── Campanhas ──────────────────────────────────────────────────────────────
create table if not exists whatsapp_campanhas (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  template_nome        text not null,        -- nome do template aprovado na Meta
  template_idioma      text not null default 'pt_BR',
  categoria            text not null check (categoria in ('marketing', 'utility')),
  lista_id             uuid references whatsapp_listas(id) on delete set null,
  status               text not null default 'rascunho'
                          check (status in ('rascunho', 'pronta', 'enviando', 'concluida', 'pausada', 'cancelada')),
  total_destinatarios  int not null default 0,
  total_enviados       int not null default 0,
  total_falhas         int not null default 0,
  total_optout_bloqueados int not null default 0,
  criado_por           uuid references public.user_profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  enviado_em           timestamptz
);

alter table whatsapp_campanhas enable row level security;

create policy "whatsapp_campanhas_select_modulo"
  on whatsapp_campanhas for select to authenticated
  using (public.tem_modulo('marketing'));

create policy "whatsapp_campanhas_insert_modulo"
  on whatsapp_campanhas for insert to authenticated
  with check (public.tem_modulo('marketing') and criado_por = auth.uid());

create policy "whatsapp_campanhas_update_modulo"
  on whatsapp_campanhas for update to authenticated
  using (public.tem_modulo('marketing'))
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_campanhas_delete_criador_admin"
  on whatsapp_campanhas for delete to authenticated
  using (criado_por = auth.uid() or public.is_admin());

-- ─── Envios individuais (funil por contato) ────────────────────────────────
-- 'entregue'/'lido' ficam pendentes de uma segunda fase que liga o webhook de
-- status da Meta (wu8wnz08n3riWqhN) a esta tabela por wamid — ver pendência
-- registrada na memória modulo_marketing_whatsapp.md. Por ora o endpoint de
-- disparo só grava 'enviado' (sucesso na chamada à Graph API) ou 'falhou'.
create table if not exists whatsapp_campanha_envios (
  id           uuid primary key default gen_random_uuid(),
  campanha_id  uuid not null references whatsapp_campanhas(id) on delete cascade,
  telefone     text not null,
  nome         text,
  status       text not null default 'pendente'
                 check (status in ('pendente', 'enviado', 'entregue', 'lido', 'falhou', 'bloqueado_optout')),
  wamid        text,
  erro         text,
  enviado_em   timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_whatsapp_envios_campanha on whatsapp_campanha_envios(campanha_id);
create index if not exists idx_whatsapp_envios_status    on whatsapp_campanha_envios(status);
create index if not exists idx_whatsapp_envios_wamid     on whatsapp_campanha_envios(wamid);

alter table whatsapp_campanha_envios enable row level security;

create policy "whatsapp_campanha_envios_select_modulo"
  on whatsapp_campanha_envios for select to authenticated
  using (public.tem_modulo('marketing'));

create policy "whatsapp_campanha_envios_insert_modulo"
  on whatsapp_campanha_envios for insert to authenticated
  with check (public.tem_modulo('marketing'));

create policy "whatsapp_campanha_envios_update_modulo"
  on whatsapp_campanha_envios for update to authenticated
  using (public.tem_modulo('marketing'))
  with check (public.tem_modulo('marketing'));

create trigger trg_whatsapp_campanhas_atualizado
  before update on whatsapp_campanhas
  for each row execute function update_atualizado_em();
