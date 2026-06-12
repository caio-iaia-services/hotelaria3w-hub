-- ─────────────────────────────────────────────────────────────────────────────
-- Suporte à migração de conversas do Multi360 (sistema legado do cliente)
-- Idempotência: permite rodar/re-rodar o importador sem duplicar registros.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. IDs de origem para deduplicar na reimportação
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS multi360_id bigint;

ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS multi360_msg_id bigint;

-- 2. Índices únicos TOTAIS (parciais não funcionam com ON CONFLICT via supabase-js).
--    Múltiplos NULL continuam permitidos (NULLS DISTINCT, default do Postgres),
--    então as linhas não-migradas (multi360_id NULL) não conflitam entre si.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chats_multi360_id
  ON chats (multi360_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mensagens_multi360_msg_id
  ON mensagens (multi360_msg_id);

-- 3. Marca o contato como originado da migração (opcional, para auditoria/limpeza)
ALTER TABLE contatos_whatsapp
  ADD COLUMN IF NOT EXISTS origem_migracao text;

-- 3b. Garante que mensagens.tipo aceita todos os tipos de mídia (incluía 'video' faltando)
ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_tipo_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_tipo_check
  CHECK (tipo IN ('texto','imagem','documento','audio','video','sticker'));

-- 4. Se houver CHECK constraint restringindo chats.canal a IA/G1/G4/ADM,
--    o canal 'FORNECEDORES' precisa ser aceito. Remove a constraint antiga
--    (nome pode variar; ajuste se necessário). Sem constraint, canal é texto livre.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'chats'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%canal%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE chats DROP CONSTRAINT %I', c);
  END IF;
END $$;
