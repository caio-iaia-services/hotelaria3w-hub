-- Adiciona suporte a Pessoa Física no cadastro de clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS pessoa_tipo text NOT NULL DEFAULT 'PJ'
    CHECK (pessoa_tipo IN ('PJ', 'PF'));

-- Índice para filtros futuros
CREATE INDEX IF NOT EXISTS idx_clientes_pessoa_tipo ON clientes(pessoa_tipo);
