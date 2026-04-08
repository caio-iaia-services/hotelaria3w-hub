-- Adiciona colunas de endereço que estavam faltando na tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro   TEXT;
