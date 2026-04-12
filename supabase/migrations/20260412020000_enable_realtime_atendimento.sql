-- Habilita Realtime para as tabelas do módulo Atendimento
-- Necessário para que o frontend receba atualizações em tempo real

ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- REPLICA IDENTITY FULL é necessário para filtros row-level no Realtime
ALTER TABLE mensagens REPLICA IDENTITY FULL;
ALTER TABLE chats REPLICA IDENTITY FULL;
