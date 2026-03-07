ALTER TABLE public.orcamento_itens ADD COLUMN IF NOT EXISTS medidas text DEFAULT NULL;

ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS tipo_layout text DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS prazo_entrega_padrao text DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS validade_dias_padrao integer DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS imagem_template_url text DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS condicoes_pagamento_padrao text DEFAULT NULL;