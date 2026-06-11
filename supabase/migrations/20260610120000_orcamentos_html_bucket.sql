-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket público para hospedar o HTML de visualização dos orçamentos
-- (link enviado no corpo do e-mail: "clique no link para visualizar")
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orcamentos-html',
  'orcamentos-html',
  true,
  5242880, -- 5 MB
  ARRAY['text/html']
)
ON CONFLICT (id) DO UPDATE SET
  public          = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['text/html'];

-- Leitura pública (cliente abre o link sem login)
DROP POLICY IF EXISTS "Public read orcamentos html" ON storage.objects;
CREATE POLICY "Public read orcamentos html"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'orcamentos-html');

-- Upload/atualização por usuários autenticados (ao enviar o orçamento)
DROP POLICY IF EXISTS "Auth upload orcamentos html" ON storage.objects;
CREATE POLICY "Auth upload orcamentos html"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'orcamentos-html');

DROP POLICY IF EXISTS "Auth update orcamentos html" ON storage.objects;
CREATE POLICY "Auth update orcamentos html"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'orcamentos-html');
