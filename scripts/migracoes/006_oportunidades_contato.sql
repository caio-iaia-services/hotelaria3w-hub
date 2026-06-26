-- Arquitetura Contatos & Clientes — Fase 4: Oportunidades/CRM x Contato (opcional)
-- Executar no Supabase SQL Editor

ALTER TABLE public.crm_cards ADD COLUMN IF NOT EXISTS contato_id uuid REFERENCES public.contatos(id);
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS contato_id uuid REFERENCES public.contatos(id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_contato ON public.crm_cards (contato_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_contato ON public.oportunidades (contato_id);

-- Indices de performance em contatos (tabela passou de 0 para >130k linhas
-- apos importacao da Base Clientes — mesmo problema de timeout ja visto em clientes)
CREATE INDEX IF NOT EXISTS idx_contatos_nome ON public.contatos (nome);
CREATE INDEX IF NOT EXISTS idx_contatos_origem ON public.contatos (origem);
CREATE INDEX IF NOT EXISTS idx_contatos_qualificacao ON public.contatos (qualificacao);
CREATE INDEX IF NOT EXISTS idx_contatos_nome_trgm ON public.contatos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contatos_email_trgm ON public.contatos USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contatos_cargo_trgm ON public.contatos USING gin (cargo gin_trgm_ops);
ANALYZE public.contatos;
