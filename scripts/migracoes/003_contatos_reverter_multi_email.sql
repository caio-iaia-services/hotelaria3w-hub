-- Reverte 002: remove suporte a multiplos e-mails e torna nome opcional
-- Executar no Supabase SQL Editor

DROP TABLE IF EXISTS contato_emails;
ALTER TABLE contatos ALTER COLUMN nome DROP NOT NULL;
