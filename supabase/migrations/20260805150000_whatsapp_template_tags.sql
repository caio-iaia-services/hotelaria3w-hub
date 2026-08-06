-- Marca quais templates da WABA são "de campanha" — a Meta não tem esse
-- conceito (é uma lista plana de templates aprovados, sem finalidade),
-- então guardamos isso localmente pra filtrar o seletor de campanhas.
--
-- Decisão do Caio em 2026-08-05: a aba Templates/Campanhas estava listando
-- também os templates usados pelo Atendimento (ex.: "oi", "tudo_bem", usados
-- pra reabrir a janela de 24h — ver [[atendimento-whatsapp-arquitetura]]).
-- Regra: templates criados pela aba Templates deste módulo já nascem
-- marcados uso_campanha=true; os que já existiam antes ficam de fora até
-- alguém marcar manualmente.

create table if not exists whatsapp_template_tags (
  id            uuid primary key default gen_random_uuid(),
  template_nome text not null unique,
  uso_campanha  boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table whatsapp_template_tags enable row level security;

drop policy if exists "whatsapp_template_tags_select_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_select_modulo"
  on whatsapp_template_tags for select to authenticated
  using (public.tem_modulo('marketing'));

drop policy if exists "whatsapp_template_tags_insert_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_insert_modulo"
  on whatsapp_template_tags for insert to authenticated
  with check (public.tem_modulo('marketing'));

drop policy if exists "whatsapp_template_tags_update_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_update_modulo"
  on whatsapp_template_tags for update to authenticated
  using (public.tem_modulo('marketing'))
  with check (public.tem_modulo('marketing'));

drop trigger if exists trg_whatsapp_template_tags_atualizado on whatsapp_template_tags;
create trigger trg_whatsapp_template_tags_atualizado
  before update on whatsapp_template_tags
  for each row execute function update_atualizado_em();
