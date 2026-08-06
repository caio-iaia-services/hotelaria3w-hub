-- Move o consentimento de marketing WhatsApp de uma tabela isolada
-- (whatsapp_opt_in, indexada por telefone solto) para dentro do módulo
-- Contatos — cada PESSOA (contatos) tem seu consentimento, não um número
-- de telefone avulso.
--
-- Decisão do Caio em 2026-08-06: consentimento de WhatsApp passa a ser um
-- campo do cadastro de Contato (como e-mail, telefone, cargo etc.), não
-- uma tela separada dentro de Marketing. Pra um contato ficar disponível
-- pra campanha, ele precisa existir em Contatos com o consentimento certo.
--
-- whatsapp_opt_in nunca teve dado real (confirmado no histórico do
-- projeto) — seguro derrubar.

drop table if exists whatsapp_opt_in cascade;

-- ─── Consentimento por contato × categoria ─────────────────────────────────
create table if not exists contato_whatsapp_consentimento (
  id             uuid primary key default gen_random_uuid(),
  contato_id     uuid not null references public.contatos(id) on delete cascade,
  categoria      text not null check (categoria in ('promocoes', 'novidades', 'avisos')),
  status         text not null default 'opt_in' check (status in ('opt_in', 'opt_out')),
  origem         text not null
                   check (origem in ('formulario_site', 'confirmacao_atendimento', 'cadastro_manual', 'anuncio_click_to_whatsapp', 'outro')),
  observacao     text,
  registrado_por uuid references public.user_profiles(id),
  registrado_em  timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (contato_id, categoria)
);

create index if not exists idx_contato_whatsapp_consent_contato on contato_whatsapp_consentimento(contato_id);
create index if not exists idx_contato_whatsapp_consent_status  on contato_whatsapp_consentimento(status);

alter table contato_whatsapp_consentimento enable row level security;

-- Visível/editável por quem tem o módulo Contatos OU Marketing — as duas
-- telas que mexem nisso agora (cadastro em Contatos, consumo em Campanhas).
drop policy if exists "contato_whatsapp_consentimento_select" on contato_whatsapp_consentimento;
create policy "contato_whatsapp_consentimento_select"
  on contato_whatsapp_consentimento for select to authenticated
  using (public.tem_modulo('contatos') or public.tem_modulo('marketing'));

drop policy if exists "contato_whatsapp_consentimento_insert" on contato_whatsapp_consentimento;
create policy "contato_whatsapp_consentimento_insert"
  on contato_whatsapp_consentimento for insert to authenticated
  with check (public.tem_modulo('contatos') or public.tem_modulo('marketing'));

drop policy if exists "contato_whatsapp_consentimento_update" on contato_whatsapp_consentimento;
create policy "contato_whatsapp_consentimento_update"
  on contato_whatsapp_consentimento for update to authenticated
  using (public.tem_modulo('contatos') or public.tem_modulo('marketing'))
  with check (public.tem_modulo('contatos') or public.tem_modulo('marketing'));

drop policy if exists "contato_whatsapp_consentimento_delete" on contato_whatsapp_consentimento;
create policy "contato_whatsapp_consentimento_delete"
  on contato_whatsapp_consentimento for delete to authenticated
  using (public.tem_modulo('contatos') or public.tem_modulo('marketing') or public.is_admin());

drop trigger if exists trg_contato_whatsapp_consent_atualizado on contato_whatsapp_consentimento;
create trigger trg_contato_whatsapp_consent_atualizado
  before update on contato_whatsapp_consentimento
  for each row execute function update_atualizado_em();

-- ─── Campanhas agora rastreiam o contato, não só o telefone solto ──────────
-- (telefone continua guardado — é o que de fato vai pra Graph API — mas o
-- contato_id permite reconferir o opt-in de forma precisa na hora de
-- disparar, e não por coincidência de string de telefone.)
alter table whatsapp_campanha_envios add column if not exists contato_id uuid references public.contatos(id) on delete set null;
create index if not exists idx_whatsapp_envios_contato on whatsapp_campanha_envios(contato_id);

-- categorias_alvo de whatsapp_campanhas já existe (migração anterior) e
-- continua igual — o que muda é de onde os contatos elegíveis são buscados.
