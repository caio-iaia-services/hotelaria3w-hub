-- Admin também precisa passar pela solicitação pra excluir/concluir tarefas
-- que não criou (antes era isento, igual a RLS original de tarefas). Admin
-- continua podendo RESPONDER pedidos de qualquer tarefa (aprovar/negar em
-- nome do criador ausente) — isso não muda, só a ação direta sem pedido.

-- Conclusão: exige uma solicitação aprovada respondida por quem está
-- marcando como concluída, quando essa pessoa não é a criadora da tarefa.
create or replace function public.check_conclusao_tarefa()
returns trigger as $$
begin
  if new.concluida = true and old.concluida = false
     and new.criado_por <> auth.uid() then
    if not exists (
      select 1 from public.tarefa_solicitacoes s
      where s.tarefa_id = new.id
        and s.tipo = 'conclusao'
        and s.status = 'aprovada'
        and s.respondido_por = auth.uid()
    ) then
      raise exception 'Conclusão por quem não é o criador só é permitida através de uma solicitação aprovada.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Exclusão: mesma lógica — só o criador direto, ou quem acabou de aprovar
-- uma solicitação de exclusão para essa tarefa específica.
drop policy if exists "tarefas_delete_criador_admin" on public.tarefas;

create policy "tarefas_delete_criador_admin"
  on public.tarefas for delete to authenticated
  using (
    public.tem_modulo('agenda')
    and (
      criado_por = auth.uid()
      or exists (
        select 1 from public.tarefa_solicitacoes s
        where s.tarefa_id = tarefas.id
          and s.tipo = 'exclusao'
          and s.status = 'aprovada'
          and s.respondido_por = auth.uid()
      )
    )
  );
