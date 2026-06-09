-- ============================================================
-- Módulo Financeiro — Categorias + Recorrência
-- 20260608120000_categorias_financeiras.sql
-- ============================================================

-- 1. Tabela de categorias personalizadas
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('entrada','saida')),
  cor         text NOT NULL DEFAULT '#6366f1',
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_categorias" ON categorias_financeiras
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_categorias_tipo  ON categorias_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON categorias_financeiras(ativo);

-- 2. Remove a constraint fixa de categoria em lancamentos_financeiros
--    para permitir categorias livres (nomes das categorias personalizadas
--    ou os 6 valores hardcoded já existentes)
ALTER TABLE lancamentos_financeiros
  DROP CONSTRAINT IF EXISTS lancamentos_financeiros_categoria_check;

-- 3. Adiciona colunas de recorrência + vínculo com categorias_financeiras
ALTER TABLE lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS categoria_id  uuid REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recorrente    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frequencia    text
    CHECK (frequencia IS NULL OR frequencia IN (
      'diaria','semanal','quinzenal','mensal',
      'bimestral','trimestral','semestral','anual'
    ));

CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria_id ON lancamentos_financeiros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_recorrente    ON lancamentos_financeiros(recorrente);

-- 4. Trigger updated_at para categorias
CREATE OR REPLACE TRIGGER trg_categorias_updated
  BEFORE UPDATE ON categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
