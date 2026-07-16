-- RLS hardening — fase 1 (auditoria 2026-07-16)
-- Escopo: user_profiles (bloqueia auto-promoção a admin), tabelas Financeiro/RH
-- (restringe por módulo do perfil) e produtos_castor_view (security_invoker).
-- Fora do escopo (standby atendimento): chats, mensagens, v_chat_por_telefone,
-- buckets de mídia.

-- ── Funções auxiliares ────────────────────────────────────────────────────────
-- SECURITY DEFINER para consultar user_profiles sem recursão de RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid()
      and ativo
      and (role = 'admin' or modulos @> array['admin_usuarios'])
  );
$$;

create or replace function public.tem_modulo(m text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid()
      and ativo
      and (role = 'admin' or modulos @> array[m])
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.tem_modulo(text) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.tem_modulo(text) to authenticated;

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- Antes: acesso total para autenticados (qualquer usuário podia se promover a
-- admin via API). Agora: leitura livre (o app lista perfis), auto-insert apenas
-- do próprio perfil sem privilégios (1º login), escrita/exclusão só para admin.
-- A edge function create-user usa service role e não é afetada.
drop policy if exists "Allow all access to user_profiles" on public.user_profiles;

create policy "profiles_select_authenticated"
  on public.user_profiles for select to authenticated
  using (true);

create policy "profiles_insert_proprio_sem_privilegio"
  on public.user_profiles for insert to authenticated
  with check (
    id = auth.uid()
    and role <> 'admin'
    and not (modulos @> array['admin_usuarios'])
  );

create policy "profiles_update_admin"
  on public.user_profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_delete_admin"
  on public.user_profiles for delete to authenticated
  using (public.is_admin());

-- ── lancamentos_financeiros ───────────────────────────────────────────────────
-- INSERT continua aberto a autenticados: o CRM (KanbanBoard) gera lançamentos
-- de comissão automaticamente ao aprovar orçamento. Leitura no Financeiro e na
-- Inteligência; alteração/exclusão só Financeiro.
drop policy if exists "allow_all_lancamentos" on public.lancamentos_financeiros;

create policy "lancamentos_select_modulo"
  on public.lancamentos_financeiros for select to authenticated
  using (public.tem_modulo('financeiro') or public.tem_modulo('planejamento'));

create policy "lancamentos_insert_authenticated"
  on public.lancamentos_financeiros for insert to authenticated
  with check (true);

create policy "lancamentos_update_financeiro"
  on public.lancamentos_financeiros for update to authenticated
  using (public.tem_modulo('financeiro'))
  with check (public.tem_modulo('financeiro'));

create policy "lancamentos_delete_financeiro"
  on public.lancamentos_financeiros for delete to authenticated
  using (public.tem_modulo('financeiro'));

-- ── colaboradores ─────────────────────────────────────────────────────────────
-- Leitura livre para autenticados: o CRM lê percentuais de comissão ao gerar
-- lançamentos. Escrita só RH/Financeiro.
drop policy if exists "allow_all_colaboradores" on public.colaboradores;

create policy "colaboradores_select_authenticated"
  on public.colaboradores for select to authenticated
  using (true);

create policy "colaboradores_write_rh_financeiro"
  on public.colaboradores for insert to authenticated
  with check (public.tem_modulo('rh') or public.tem_modulo('financeiro'));

create policy "colaboradores_update_rh_financeiro"
  on public.colaboradores for update to authenticated
  using (public.tem_modulo('rh') or public.tem_modulo('financeiro'))
  with check (public.tem_modulo('rh') or public.tem_modulo('financeiro'));

create policy "colaboradores_delete_rh_financeiro"
  on public.colaboradores for delete to authenticated
  using (public.tem_modulo('rh') or public.tem_modulo('financeiro'));

-- ── metas_empresa ─────────────────────────────────────────────────────────────
-- Leitura livre (Dashboard/Inteligência); escrita Inteligência (módulo
-- planejamento) e Financeiro.
drop policy if exists "allow_all_metas" on public.metas_empresa;

create policy "metas_select_authenticated"
  on public.metas_empresa for select to authenticated
  using (true);

create policy "metas_insert_modulo"
  on public.metas_empresa for insert to authenticated
  with check (public.tem_modulo('planejamento') or public.tem_modulo('financeiro'));

create policy "metas_update_modulo"
  on public.metas_empresa for update to authenticated
  using (public.tem_modulo('planejamento') or public.tem_modulo('financeiro'))
  with check (public.tem_modulo('planejamento') or public.tem_modulo('financeiro'));

create policy "metas_delete_modulo"
  on public.metas_empresa for delete to authenticated
  using (public.tem_modulo('planejamento') or public.tem_modulo('financeiro'));

-- ── categorias_financeiras ────────────────────────────────────────────────────
drop policy if exists "allow_all_categorias" on public.categorias_financeiras;

create policy "categorias_fin_select_authenticated"
  on public.categorias_financeiras for select to authenticated
  using (true);

create policy "categorias_fin_insert_financeiro"
  on public.categorias_financeiras for insert to authenticated
  with check (public.tem_modulo('financeiro'));

create policy "categorias_fin_update_financeiro"
  on public.categorias_financeiras for update to authenticated
  using (public.tem_modulo('financeiro'))
  with check (public.tem_modulo('financeiro'));

create policy "categorias_fin_delete_financeiro"
  on public.categorias_financeiras for delete to authenticated
  using (public.tem_modulo('financeiro'));

-- ── produtos_castor_view ──────────────────────────────────────────────────────
-- Era SECURITY DEFINER (legível até pela anon key). Com security_invoker o RLS
-- das tabelas base vale para quem consulta — usuários logados seguem lendo.
alter view public.produtos_castor_view set (security_invoker = true);
