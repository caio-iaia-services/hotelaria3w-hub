-- Módulo CONTATOS — 3W Hotelaria
-- Executar no Supabase SQL Editor

-- Tabela principal de contatos (pessoas físicas)
CREATE TABLE IF NOT EXISTS contatos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  email         text NOT NULL,
  telefone      text,
  whatsapp      text,
  cpf           text,
  data_nascimento date,
  cargo         text,
  origem        text,
  status        text NOT NULL DEFAULT 'ativo',
  preferencia_contato text,
  observacoes   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices de busca
CREATE INDEX IF NOT EXISTS contatos_nome_idx  ON contatos USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS contatos_email_idx ON contatos (email);
CREATE INDEX IF NOT EXISTS contatos_status_idx ON contatos (status);

-- Tabela de vínculo N:N contatos ↔ clientes
CREATE TABLE IF NOT EXISTS contato_cliente (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id  uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contato_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS contato_cliente_contato_idx ON contato_cliente (contato_id);
CREATE INDEX IF NOT EXISTS contato_cliente_cliente_idx ON contato_cliente (cliente_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contatos_updated_at
  BEFORE UPDATE ON contatos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: somente usuários autenticados
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contato_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver contatos"
  ON contatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir contatos"
  ON contatos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar contatos"
  ON contatos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem deletar contatos"
  ON contatos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Autenticados podem ver vínculos"
  ON contato_cliente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir vínculos"
  ON contato_cliente FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem deletar vínculos"
  ON contato_cliente FOR DELETE TO authenticated USING (true);
