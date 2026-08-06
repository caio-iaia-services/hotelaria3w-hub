-- Generaliza whatsapp_template_tags: em vez de um boolean só pra campanha
-- (uso_campanha), passa a guardar um array de finalidades ('atendimento' |
-- 'campanha') — a mesma tabela agora serve tanto pro módulo Marketing
-- quanto pro Atendimento, já que a gestão de templates virou uma tela
-- central em Admin (não faz mais sentido "de campanha" ser a única opção).
--
-- Decisão do Caio em 2026-08-05: templates são ferramenta de uso geral do
-- sistema — qualquer módulo que precise pode ter os seus. Cada um filtra
-- pela finalidade certa: Atendimento só mostra quem tem 'atendimento' (ou
-- NENHUMA tag ainda — ver nota abaixo), Campanhas só mostra quem tem
-- 'campanha' explicitamente.
--
-- IMPORTANTE — compatibilidade com o que já existe: os templates "oi" e
-- "tudo_bem" (usados pelo Atendimento pra reabrir a janela de 24h) nunca
-- tiveram nenhuma linha nesta tabela. Se a regra fosse "só mostra quem tem
-- a tag 'atendimento'", eles sumiriam do dropdown do Atendimento e
-- quebrariam produção. Por isso a regra aplicada no código (não aqui) é:
-- sem tag nenhuma = continua visível no Atendimento (comportamento de
-- sempre, preservado); só fica de fora se alguém marcar explicitamente
-- SÓ 'campanha' (sem 'atendimento').

alter table whatsapp_template_tags add column if not exists finalidades text[] not null default '{}';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'whatsapp_template_tags' and column_name = 'uso_campanha'
  ) then
    update whatsapp_template_tags
      set finalidades = array['campanha']
      where uso_campanha = true and finalidades = '{}';
    alter table whatsapp_template_tags drop column uso_campanha;
  end if;
end $$;
