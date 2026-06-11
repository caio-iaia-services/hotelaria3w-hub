-- ─────────────────────────────────────────────────────────────────────────────
-- Suporte à migração de conversas do Multi360 (sistema legado do cliente)
-- Idempotência: permite rodar/re-rodar o importador sem duplicar registros.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. IDs de origem para deduplicar na reimportação
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS multi360_id bigint;

ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS multi360_msg_id bigint;

-- 2. Índices únicos parciais (só linhas migradas) → habilitam UPSERT por onConflict
CREATE UNIQUE INDEX IF NOT EXISTS uq_chats_multi360_id
  ON chats (multi360_id) WHERE multi360_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mensagens_multi360_msg_id
  ON mensagens (multi360_msg_id) WHERE multi360_msg_id IS NOT NULL;

-- 3. Marca o contato como originado da migração (opcional, para auditoria/limpeza)
ALTER TABLE contatos_whatsapp
  ADD COLUMN IF NOT EXISTS origem_migracao text;

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
