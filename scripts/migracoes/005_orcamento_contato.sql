-- Arquitetura Contatos & Clientes — Fase 3: Orcamentos x Contatos (N:N, max 7)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.orcamento_contato (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  contato_id   uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  principal    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orcamento_id, contato_id)
);

CREATE INDEX IF NOT EXISTS idx_orcamento_contato_orcamento ON public.orcamento_contato (orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_contato_contato ON public.orcamento_contato (contato_id);

ALTER TABLE public.orcamento_contato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados acesso total - orcamento_contato" ON public.orcamento_contato FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Limite de 7 contatos por orcamento e obrigatoriedade minima ficam
-- validados no app (OrcamentoModal.tsx), nao como constraint de banco.
