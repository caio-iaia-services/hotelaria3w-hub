-- Módulo Agenda/Tarefas — tabela tarefas + RLS
-- Tarefas atribuíveis a qualquer usuário do sistema, visíveis pra equipe toda
-- (módulo agenda), opcionalmente linkadas a uma oportunidade/cliente do CRM.
-- Reaproveita public.is_admin() e public.tem_modulo(text), criadas em
-- 20260716180000_rls_hardening_fase1.sql.

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  responsavel_id uuid not null references public.user_profiles(id),
  criado_por uuid not null references public.user_profiles(id),
  oportunidade_id uuid references public.oportunidades(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nome text,
  data date,
  hora time,
  concluida boolean not null default false,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tarefas_responsavel on public.tarefas(responsavel_id);
create index idx_tarefas_data on public.tarefas(data);
create index idx_tarefas_oportunidade on public.tarefas(oportunidade_id);

alter table public.tarefas enable row level security;

-- Leitura: qualquer usuário autenticado com o módulo agenda vê todas as
-- tarefas (a Agenda mostra o calendário da equipe toda, não só do usuário).
create policy "tarefas_select_modulo"
  on public.tarefas for select to authenticated
  using (public.tem_modulo('agenda'));

-- Criação: qualquer usuário com o módulo, só em nome de si mesmo como criador.
create policy "tarefas_insert_modulo"
  on public.tarefas for insert to authenticated
  with check (public.tem_modulo('agenda') and criado_por = auth.uid());

-- Edição/conclusão: responsável, criador ou admin.
create policy "tarefas_update_responsavel_criador_admin"
  on public.tarefas for update to authenticated
  using (
    public.tem_modulo('agenda')
    and (responsavel_id = auth.uid() or criado_por = auth.uid() or public.is_admin())
  )
  with check (
    public.tem_modulo('agenda')
    and (responsavel_id = auth.uid() or criado_por = auth.uid() or public.is_admin())
  );

-- Exclusão: só quem criou ou admin.
create policy "tarefas_delete_criador_admin"
  on public.tarefas for delete to authenticated
  using (
    public.tem_modulo('agenda')
    and (criado_por = auth.uid() or public.is_admin())
  );
