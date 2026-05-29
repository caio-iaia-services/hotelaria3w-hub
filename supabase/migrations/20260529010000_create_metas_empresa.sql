-- ============================================================
-- Módulo Inteligência — tabela de Metas da Empresa
-- ============================================================

CREATE TABLE IF NOT EXISTS metas_empresa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN (
                 'vendas_volume',   -- volume R$ de vendas consolidadas
                 'vendas_qtd',      -- quantidade de deals fechados
                 'comissao',        -- receita de comissão
                 'conversao',       -- taxa de conversão %
                 'clientes_novos',  -- novos clientes no período
                 'orcamentos_qtd',  -- quantidade de orçamentos gerados
                 'custom'           -- meta livre
               )),
  unidade      text NOT NULL DEFAULT 'brl' CHECK (unidade IN ('brl','qtd','pct')),
  valor_meta   numeric(15,2) NOT NULL,
  periodo_tipo text NOT NULL DEFAULT 'mensal' CHECK (periodo_tipo IN ('mensal','trimestral','anual')),
  data_inicio  date NOT NULL,
  data_fim     date NOT NULL,
  gestao       text CHECK (gestao IN ('G1','G4','ADM') OR gestao IS NULL),
  descricao    text,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE metas_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_metas" ON metas_empresa FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_metas_tipo        ON metas_empresa(tipo);
CREATE INDEX IF NOT EXISTS idx_metas_periodo     ON metas_empresa(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_metas_gestao      ON metas_empresa(gestao);
CREATE INDEX IF NOT EXISTS idx_metas_ativo       ON metas_empresa(ativo);

CREATE OR REPLACE TRIGGER trg_metas_updated
  BEFORE UPDATE ON metas_empresa
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
