CREATE TABLE IF NOT EXISTS public.orcamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  card_id uuid,
  cliente_id uuid NOT NULL,
  cliente_nome text NOT NULL,
  cliente_razao_social text,
  cliente_cnpj text,
  cliente_endereco text,
  cliente_email text,
  cliente_telefone text,
  fornecedor_id uuid,
  fornecedor_nome text,
  operacao text,
  gestao text,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  frete numeric(15,2) NOT NULL DEFAULT 0,
  impostos numeric(15,2) NOT NULL DEFAULT 0,
  desconto numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  prazo_entrega text,
  validade_dias integer NOT NULL DEFAULT 30,
  data_validade timestamptz,
  condicoes_pagamento jsonb,
  observacoes text,
  status text NOT NULL DEFAULT 'rascunho',
  enviado_em timestamptz,
  aprovado_em timestamptz,
  pdf_url text,
  html_content text,
  codigo_empresa text,
  imagem_marketing_url text,
  termos_3w text,
  termos_fornecedor text,
  assinatura_cliente text,
  assinado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orcamento_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  codigo text,
  descricao text NOT NULL,
  especificacoes text,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to orcamentos" ON public.orcamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to orcamento_itens" ON public.orcamento_itens FOR ALL USING (true) WITH CHECK (true);