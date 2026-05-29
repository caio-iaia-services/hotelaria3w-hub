-- ============================================================
-- Módulo Financeiro — tabelas base
-- ============================================================

-- 1. Colaboradores (quem recebe comissão da empresa)
CREATE TABLE IF NOT EXISTS colaboradores (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid,                     -- vínculo opcional com auth.users
  nome                        text NOT NULL,
  cargo                       text,
  tipo                        text NOT NULL DEFAULT 'colaborador'
                                CHECK (tipo IN ('gestor','colaborador')),
  gestao                      text                      -- 'G1'|'G4'|'ADM' (para gestores)
                                CHECK (gestao IN ('G1','G4','ADM') OR gestao IS NULL),

  -- Regras de comissão
  percentual_vendas_proprias  numeric(5,2) NOT NULL DEFAULT 0,  -- % sobre suas próprias vendas
  percentual_todas_vendas     numeric(5,2) NOT NULL DEFAULT 0,  -- % sobre todas as vendas
  valor_fixo                  numeric(12,2) NOT NULL DEFAULT 0, -- base fixa mensal (se houver)

  ativo                       boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_colaboradores" ON colaboradores FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_colaboradores_gestao ON colaboradores(gestao);
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo  ON colaboradores(ativo);

-- 2. Lançamentos Financeiros (todas as entradas e saídas)
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tipo             text NOT NULL CHECK (tipo IN ('entrada','saida')),
  categoria        text NOT NULL CHECK (categoria IN (
                     'comissao_fornecedor',   -- entrada: 3W recebe % do fornecedor
                     'comissao_gestor',       -- saída: gestor recebe % das suas vendas
                     'comissao_colaborador',  -- saída: colaborador recebe % de tudo
                     'despesa_fixa',          -- saída: aluguel, assinatura, etc
                     'despesa_variavel',      -- saída: avulso
                     'receita_extra'          -- entrada: avulso
                   )),

  -- Referências opcionais (comissões têm vínculo com venda)
  orcamento_id     uuid REFERENCES orcamentos(id) ON DELETE SET NULL,
  card_id          uuid REFERENCES crm_cards(id)  ON DELETE SET NULL,
  fornecedor_id    uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  colaborador_id   uuid REFERENCES colaboradores(id) ON DELETE SET NULL,

  -- Valores
  valor_base       numeric(15,2),      -- total do orçamento (base de cálculo)
  percentual       numeric(5,2),       -- % aplicada
  valor            numeric(15,2) NOT NULL,  -- valor do lançamento

  -- Status de pagamento
  status           text NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','confirmado','pago','cancelado')),

  -- Datas
  data_competencia date NOT NULL,      -- mês/ano de referência
  data_vencimento  date,
  data_pagamento   date,

  -- Meta
  descricao        text,
  observacoes      text,
  origem           text NOT NULL DEFAULT 'manual'
                     CHECK (origem IN ('manual','automatico')),

  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_lancamentos" ON lancamentos_financeiros FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo          ON lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria     ON lancamentos_financeiros(categoria);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status        ON lancamentos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_competencia   ON lancamentos_financeiros(data_competencia DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_card          ON lancamentos_financeiros(card_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_colaborador   ON lancamentos_financeiros(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fornecedor    ON lancamentos_financeiros(fornecedor_id);

-- 3. Trigger updated_at nos colaboradores
CREATE OR REPLACE TRIGGER trg_colaboradores_updated
  BEFORE UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_lancamentos_updated
  BEFORE UPDATE ON lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
