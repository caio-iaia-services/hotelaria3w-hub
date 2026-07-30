-- Solicitações de exclusão/conclusão de tarefas: quem não é o criador precisa
-- do consentimento do criador pra deletar ou concluir uma tarefa. Reaproveita
-- public.is_admin() e public.tem_modulo(text), criadas em
-- 20260716180000_rls_hardening_fase1.sql.

create table public.tarefa_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  tipo text not null check (tipo in ('exclusao','conclusao')),
  status text not null default 'pendente'
    check (status in ('pendente','aprovada','negada','aguardando_verificacao')),
  solicitante_id uuid not null references public.user_profiles(id),
  motivo text not null,
  respondido_por uuid references public.user_profiles(id),
  respondido_em timestamptz,
  motivo_resposta text,
  created_at timestamptz not null default now()
);

create index idx_tarefa_solicitacoes_tarefa on public.tarefa_solicitacoes(tarefa_id);

-- só um pedido ativo por tipo por tarefa
create unique index uq_tarefa_solicitacoes_pendente
  on public.tarefa_solicitacoes(tarefa_id, tipo)
  where status in ('pendente','aguardando_verificacao');

alter table public.tarefa_solicitacoes enable row level security;

create policy "tarefa_solicitacoes_select_modulo"
  on public.tarefa_solicitacoes for select to authenticated
  using (public.tem_modulo('agenda'));

create policy "tarefa_solicitacoes_insert_solicitante"
  on public.tarefa_solicitacoes for insert to authenticated
  with check (
    public.tem_modulo('agenda')
    and solicitante_id = auth.uid()
    and exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and t.criado_por <> auth.uid()
    )
  );

-- Responder (aprovar/negar/aguardar verificação): só o criador da tarefa ou admin.
create policy "tarefa_solicitacoes_update_criador_admin"
  on public.tarefa_solicitacoes for update to authenticated
  using (
    status in ('pendente','aguardando_verificacao')
    and exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id
        and (t.criado_por = auth.uid() or public.is_admin())
    )
  )
  with check (
    respondido_por = auth.uid()
    and exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id
        and (t.criado_por = auth.uid() or public.is_admin())
    )
  );

-- Defesa em profundidade: bloqueia marcar como concluída diretamente quando
-- quem está atualizando não é o criador nem admin (mesmo via API direta,
-- fora do fluxo de solicitação/aprovação). Reabrir uma tarefa concluída
-- (true → false) continua liberado pela RLS de update já existente.
create or replace function public.check_conclusao_tarefa()
returns trigger as $$
begin
  if new.concluida = true and old.concluida = false
     and new.criado_por <> auth.uid()
     and not public.is_admin() then
    raise exception 'Apenas o criador da tarefa (ou admin) pode concluir diretamente. Solicite a conclusão.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_check_conclusao_tarefa
  before update on public.tarefas
  for each row execute function public.check_conclusao_tarefa();
