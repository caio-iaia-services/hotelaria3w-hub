-- Configurações por gestão: taxa de comissão e outras configs futuras
CREATE TABLE IF NOT EXISTS configuracoes_gestao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestao TEXT NOT NULL UNIQUE,
  comissao_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes_gestao ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler
CREATE POLICY "leitura_autenticada" ON configuracoes_gestao
  FOR SELECT TO authenticated USING (true);

-- Qualquer autenticado pode escrever (controle de acesso feito no app)
CREATE POLICY "escrita_autenticada" ON configuracoes_gestao
  FOR ALL TO authenticated USING (true);
