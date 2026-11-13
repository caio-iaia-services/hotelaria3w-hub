-- Bucket para hospedar o PDF do pedido, a planilha e os anexos (ex.: comprovante de pagamento)
-- enviados por WhatsApp (link) ou como link complementar no e-mail.
-- Caminhos têm um uuid aleatório (não adivinháveis); leitura pública para o destinatário abrir sem login.
-- Rodar no SQL Editor do Supabase (projeto zaitvvwoqwdgtliocvtf).

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pedidos-anexos', 'pedidos-anexos', true, 20971520) -- 20 MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520;

DROP POLICY IF EXISTS "Public read pedidos anexos" ON storage.objects;
CREATE POLICY "Public read pedidos anexos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'pedidos-anexos');

DROP POLICY IF EXISTS "Auth upload pedidos anexos" ON storage.objects;
CREATE POLICY "Auth upload pedidos anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pedidos-anexos');
