-- Arquitetura Contatos & Clientes — Fase 2: Atendimento (WhatsApp) x Contato
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.contato_whatsapp (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id           uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  contato_whatsapp_id  uuid NOT NULL REFERENCES public.contatos_whatsapp(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contato_id, contato_whatsapp_id)
);

CREATE INDEX IF NOT EXISTS idx_contato_whatsapp_contato ON public.contato_whatsapp (contato_id);
CREATE INDEX IF NOT EXISTS idx_contato_whatsapp_whatsapp ON public.contato_whatsapp (contato_whatsapp_id);

ALTER TABLE public.contato_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados acesso total - contato_whatsapp" ON public.contato_whatsapp FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- N:N — um numero de WhatsApp pode estar vinculado a 0..N Contatos (pessoas),
-- e um Contato pode ter sido visto em mais de um numero de WhatsApp.
