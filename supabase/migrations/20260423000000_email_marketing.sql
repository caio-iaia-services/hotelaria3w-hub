-- ─── Listas de contatos segmentadas ─────────────────────────────────────────
create table if not exists email_listas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  nome          text not null,
  descricao     text,
  filtros       jsonb default '{}',
  total_contatos int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table email_listas enable row level security;

create policy "email_listas_self" on email_listas
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Campanhas de email marketing ────────────────────────────────────────────
create table if not exists email_campanhas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade,
  nome                 text not null,
  assunto              text not null,
  pre_header           text,
  remetente_nome       text,
  remetente_email      text,
  lista_id             uuid references email_listas(id) on delete set null,
  conteudo_html        text,
  template_tipo        text default 'custom',
  status               text default 'rascunho',   -- rascunho|agendada|enviando|enviada|pausada|cancelada
  tipo_envio           text default 'imediato',    -- imediato|agendado|recorrente
  agendado_para        timestamptz,
  recorrencia          jsonb,                       -- {frequencia, dia, hora}
  total_destinatarios  int default 0,
  total_enviados       int default 0,
  total_abertos        int default 0,
  total_clicados       int default 0,
  total_descadastros   int default 0,
  total_bounces        int default 0,
  enviado_em           timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table email_campanhas enable row level security;

create policy "email_campanhas_self" on email_campanhas
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Histórico de envios individuais ─────────────────────────────────────────
create table if not exists email_envios (
  id                uuid primary key default gen_random_uuid(),
  campanha_id       uuid references email_campanhas(id) on delete cascade,
  cliente_id        uuid references clientes(id) on delete set null,
  email             text not null,
  nome_destinatario text,
  status            text default 'pendente',   -- pendente|enviado|aberto|clicado|bounce|descadastro|erro
  enviado_em        timestamptz,
  aberto_em         timestamptz,
  clicado_em        timestamptz,
  bounce_tipo       text,
  erro_mensagem     text,
  created_at        timestamptz default now()
);

alter table email_envios enable row level security;

create policy "email_envios_self" on email_envios
  using (
    exists (
      select 1 from email_campanhas
      where email_campanhas.id = email_envios.campanha_id
        and email_campanhas.user_id = auth.uid()
    )
  );
