-- Modulo CONTATOS — suporte a multiplos e-mails por contato
-- Executar no Supabase SQL Editor

-- E-mails adicionais (o e-mail principal continua em contatos.email, obrigatorio)
CREATE TABLE IF NOT EXISTS contato_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id  uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contato_emails_contato_idx ON contato_emails (contato_id);

ALTER TABLE contato_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver emails extras"
  ON contato_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir emails extras"
  ON contato_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem deletar emails extras"
  ON contato_emails FOR DELETE TO authenticated USING (true);
