
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS frete_tipo text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impostos_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_emissao timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacoes_gerais text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS difal_texto text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS imagem_publicidade_url text DEFAULT NULL;
