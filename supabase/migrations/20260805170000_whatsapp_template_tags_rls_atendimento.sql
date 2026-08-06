-- whatsapp_template_tags virou infraestrutura compartilhada (Atendimento +
-- Marketing), não só de campanha — a RLS precisa liberar pra quem tem
-- QUALQUER um dos dois módulos, não só 'marketing'. Sem isso, um atendente
-- sem o módulo marketing conseguiria criar o template na Meta (via
-- api/criar-template.ts, que não checa módulo) mas a marcação de
-- finalidade falharia silenciosamente por RLS.

drop policy if exists "whatsapp_template_tags_select_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_select_modulo"
  on whatsapp_template_tags for select to authenticated
  using (public.tem_modulo('marketing') or public.tem_modulo('atendimento'));

drop policy if exists "whatsapp_template_tags_insert_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_insert_modulo"
  on whatsapp_template_tags for insert to authenticated
  with check (public.tem_modulo('marketing') or public.tem_modulo('atendimento'));

drop policy if exists "whatsapp_template_tags_update_modulo" on whatsapp_template_tags;
create policy "whatsapp_template_tags_update_modulo"
  on whatsapp_template_tags for update to authenticated
  using (public.tem_modulo('marketing') or public.tem_modulo('atendimento'))
  with check (public.tem_modulo('marketing') or public.tem_modulo('atendimento'));
