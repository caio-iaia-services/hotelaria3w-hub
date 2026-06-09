-- ─────────────────────────────────────────────────────────────────────────────
-- Cria (ou reconfigura) o bucket público chat-midia para arquivos do Atendimento
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Bucket público, limite 50 MB, aceita imagens / áudios / vídeos / documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-midia',
  'chat-midia',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public          = true,
  file_size_limit = 52428800;

-- 2. Leitura pública (qualquer um pode ver as mídias — necessário para exibir no chat)
DROP POLICY IF EXISTS "Public read access to chat media" ON storage.objects;
CREATE POLICY "Public read access to chat media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-midia');

-- 3. Upload apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-midia');

-- 4. Atualização (upsert de arquivo) para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can update chat media" ON storage.objects;
CREATE POLICY "Authenticated users can update chat media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-midia');

-- 5. Exclusão para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can delete chat media" ON storage.objects;
CREATE POLICY "Authenticated users can delete chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-midia');

-- 6. Adiciona coluna media_url na tabela mensagens (para guardar URL original da mídia
--    separada do conteudo/legenda, compatível com o que n8n envia)
ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS duracao_segundos integer; -- útil para áudios
