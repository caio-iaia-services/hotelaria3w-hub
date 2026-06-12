-- ─────────────────────────────────────────────────────────────────────────────
-- Atendimento: Mensagens Rápidas (respostas prontas) + Tags de conversa
-- Funcionalidades trazidas do Multi360.
-- ─────────────────────────────────────────────────────────────────────────────

-- Mensagens rápidas (respostas prontas para o atendente inserir no chat)
CREATE TABLE IF NOT EXISTS mensagens_rapidas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atalho     text NOT NULL,              -- ex: "/bomdia"
  titulo     text NOT NULL,
  conteudo   text NOT NULL,
  canal      text CHECK (canal IN ('IA','G1','G4','ADM','FORNECEDORES')), -- NULL = global
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Tags de atendimento
CREATE TABLE IF NOT EXISTS tags_atendimento (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  cor       text NOT NULL DEFAULT '#164B6E',
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Vínculo tag↔chat como array no próprio chat (simples de ler/escrever no front)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS tags uuid[] DEFAULT '{}';

ALTER TABLE mensagens_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags_atendimento  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth msg rapidas" ON mensagens_rapidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth tags"        ON tags_atendimento  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO tags_atendimento (nome, cor) VALUES
  ('Fornecedor', '#7c3aed'), ('Orçamento', '#0891b2'), ('Urgente', '#dc2626'),
  ('Pós-venda', '#16a34a'), ('Cliente novo', '#ea580c')
ON CONFLICT (nome) DO NOTHING;
