-- View usada pelo n8n para buscar chat ativo pelo telefone do contato
CREATE OR REPLACE VIEW v_chat_por_telefone AS
SELECT
  c.id,
  c.contato_id,
  c.canal,
  c.status,
  c.ia_ativa,
  c.ultima_mensagem_em,
  c.criado_em,
  c.atualizado_em,
  ct.telefone,
  ct.nome
FROM chats c
JOIN contatos_whatsapp ct ON ct.id = c.contato_id
WHERE c.status IN ('ativo', 'pausado');
