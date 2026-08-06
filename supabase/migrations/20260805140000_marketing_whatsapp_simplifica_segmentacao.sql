-- Simplifica o módulo Marketing → WhatsApp: remove a etapa manual de
-- "Listas" (criar lista → abrir gerenciar → marcar contato por contato) e
-- troca por segmentação automática por categoria na própria campanha.
--
-- Decisão do Caio em 2026-08-05: o módulo estava complexo demais pro
-- usuário do dia a dia. Como whatsapp_listas/whatsapp_lista_contatos ainda
-- não tinham NENHUM dado real (nada foi populado até aqui), é seguro
-- remover agora — nada se perde.

alter table whatsapp_campanhas drop column if exists lista_id;
alter table whatsapp_campanhas add column if not exists categorias_alvo text[] not null default '{}';

drop table if exists whatsapp_lista_contatos cascade;
drop table if exists whatsapp_listas cascade;
drop function if exists public.checar_opt_in_lista();
