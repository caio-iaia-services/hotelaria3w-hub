-- ============================================================
-- Migração: Novos campos no cadastro de clientes
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar novos campos na tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS whatsapp                      text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual_tipo       text,           -- 'isento' | 'sem_informacao' | 'numero'
  ADD COLUMN IF NOT EXISTS inscricao_estadual            text,
  ADD COLUMN IF NOT EXISTS cnpj_validado                 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_primeira_compra          date,
  ADD COLUMN IF NOT EXISTS data_ultima_compra            date,
  ADD COLUMN IF NOT EXISTS qtd_orcada                    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_comprada                  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pedidos_consolidados    numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pedidos_nao_consolidados numeric(14,2) DEFAULT 0,
  -- Campos de inteligência: Hotelaria
  ADD COLUMN IF NOT EXISTS hotel_uhs                     integer,
  ADD COLUMN IF NOT EXISTS hotel_leitos                  integer,
  ADD COLUMN IF NOT EXISTS hotel_uhs_acessiveis          integer,
  ADD COLUMN IF NOT EXISTS hotel_leitos_acessiveis       integer,
  ADD COLUMN IF NOT EXISTS hotel_tipo                    text,
  ADD COLUMN IF NOT EXISTS hotel_classificacao           text,
  ADD COLUMN IF NOT EXISTS hotel_perfil                  text,
  ADD COLUMN IF NOT EXISTS hotel_tem_spa                 boolean;

-- 2. Criar tabela de contatos do cliente
CREATE TABLE IF NOT EXISTS contatos_cliente (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  email       text,
  telefone    text,
  whatsapp    text,
  principal   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 3. Índice para busca por cliente
CREATE INDEX IF NOT EXISTS idx_contatos_cliente_cliente_id ON contatos_cliente(cliente_id);

-- 4. Habilitar RLS na nova tabela
ALTER TABLE contatos_cliente ENABLE ROW LEVEL SECURITY;

-- 5. Policy: autenticados podem fazer tudo (ajuste conforme a política de segurança do projeto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contatos_cliente' AND policyname = 'allow_authenticated'
  ) THEN
    CREATE POLICY allow_authenticated ON contatos_cliente
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
