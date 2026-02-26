
-- Create fornecedores table
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  codigo TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  tipo TEXT NOT NULL DEFAULT 'regular',
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  site TEXT,
  site_2 TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  contatos JSONB,
  logotipo_url TEXT,
  catalogos JSONB,
  data_inicio TEXT,
  contrato TEXT,
  condicoes_pagamento JSONB,
  num_orcamentos INTEGER,
  volume_orcamentos NUMERIC,
  orcamento_medio NUMERIC,
  num_vendas INTEGER,
  volume_vendas NUMERIC,
  venda_media NUMERIC,
  a_receber NUMERIC,
  pendentes INTEGER,
  linhas_produtos TEXT[],
  segmentos_atuacao TEXT[],
  observacoes TEXT,
  gestao TEXT,
  produtos_servicos TEXT,
  comissao_vendas NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS for now (no auth in place)
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to fornecedores"
ON public.fornecedores FOR ALL
USING (true)
WITH CHECK (true);

-- Create storage bucket for supplier documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('fornecedores-documentos', 'fornecedores-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read fornecedores docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'fornecedores-documentos');

CREATE POLICY "Allow upload fornecedores docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fornecedores-documentos');

CREATE POLICY "Allow delete fornecedores docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'fornecedores-documentos');
