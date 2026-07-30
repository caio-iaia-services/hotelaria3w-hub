-- Só o criador da tarefa responde (aprova/nega/aguarda verificação) um
-- pedido de exclusão/conclusão — admin deixa de ter esse poder também.
-- Sem isso, um admin que gerava um pedido numa tarefa alheia conseguia ele
-- mesmo aprovar e executar a ação, porque a policy de resposta ainda o
-- isentava.

drop policy if exists "tarefa_solicitacoes_update_criador_admin" on public.tarefa_solicitacoes;

create policy "tarefa_solicitacoes_update_criador"
  on public.tarefa_solicitacoes for update to authenticated
  using (
    status in ('pendente','aguardando_verificacao')
    and exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and t.criado_por = auth.uid()
    )
  )
  with check (
    respondido_por = auth.uid()
    and exists (
      select 1 from public.tarefas t
      where t.id = tarefa_id and t.criado_por = auth.uid()
    )
  );
