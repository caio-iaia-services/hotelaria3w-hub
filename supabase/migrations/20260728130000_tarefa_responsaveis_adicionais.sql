-- Responsáveis adicionais por tarefa (ex.: reunião de time — vários responsáveis
-- além do principal). O responsavel_id continua sendo o principal (controla o
-- filtro de oportunidades por gestão no modal); esta tabela guarda os extras.

create table public.tarefa_responsaveis (
  tarefa_id  uuid not null references public.tarefas(id) on delete cascade,
  usuario_id uuid not null references public.user_profiles(id),
  criado_em  timestamptz not null default now(),
  primary key (tarefa_id, usuario_id)
);

create index idx_tarefa_responsaveis_usuario on public.tarefa_responsaveis(usuario_id);

alter table public.tarefa_responsaveis enable row level security;

create policy "tarefa_responsaveis_select_modulo"
  on public.tarefa_responsaveis for select to authenticated
  using (public.tem_modulo('agenda'));

-- Quem pode gerenciar tarefas (responsável principal, criador ou admin) também
-- pode gerenciar a lista de responsáveis adicionais dela.
create policy "tarefa_responsaveis_write_dono_tarefa"
  on public.tarefa_responsaveis for all to authenticated
  using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id
        and (t.responsavel_id = auth.uid() or t.criado_por = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id
        and (t.responsavel_id = auth.uid() or t.criado_por = auth.uid() or public.is_admin())
    )
  );

-- A policy de update de tarefas passa a considerar também os responsáveis
-- adicionais (ex.: alguém convidado numa reunião de time consegue concluir a
-- própria participação/editar a tarefa).
drop policy if exists "tarefas_update_responsavel_criador_admin" on public.tarefas;

create policy "tarefas_update_responsavel_criador_admin"
  on public.tarefas for update to authenticated
  using (
    public.tem_modulo('agenda')
    and (
      responsavel_id = auth.uid()
      or criado_por = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.tarefa_responsaveis tr
        where tr.tarefa_id = tarefas.id and tr.usuario_id = auth.uid()
      )
    )
  )
  with check (
    public.tem_modulo('agenda')
    and (
      responsavel_id = auth.uid()
      or criado_por = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.tarefa_responsaveis tr
        where tr.tarefa_id = tarefas.id and tr.usuario_id = auth.uid()
      )
    )
  );
