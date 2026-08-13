-- View de apoio ao alerta pop-up de "janela de atendimento fechando" (60/30/15 min).
-- Cloud API da Meta só permite mensagem livre até 24h após a ÚLTIMA mensagem do
-- CLIENTE numa conversa — depois disso só template. Retorna, por conversa ativa,
-- o horário da última mensagem do cliente, pra cada canal calcular quanto falta.
--
-- Escopo restrito de propósito (mantém a query barata pra rodar em polling
-- global, ver incidente de egress 2026-08-04): só chats não encerrados com
-- mensagem do cliente nas últimas 25h — fora disso a janela já fechou de vez
-- e não interessa pro alerta.
create or replace view v_janela_chats_ativos as
select
  c.id as chat_id,
  c.canal,
  c.contato_id,
  cw.nome as contato_nome,
  cw.telefone as contato_telefone,
  m.ultima_msg_cliente
from chats c
join lateral (
  select max(msg.criado_em) as ultima_msg_cliente
  from mensagens msg
  where msg.chat_id = c.id
    and msg.origem = 'cliente'
    and msg.criado_em > now() - interval '25 hours'
) m on true
left join contatos_whatsapp cw on cw.id = c.contato_id
where c.status <> 'encerrado'
  and m.ultima_msg_cliente is not null;

-- Acelera o LATERAL acima (scan por chat_id + origem, mais recente primeiro).
create index if not exists idx_mensagens_chat_origem_criado
  on mensagens (chat_id, origem, criado_em desc);
