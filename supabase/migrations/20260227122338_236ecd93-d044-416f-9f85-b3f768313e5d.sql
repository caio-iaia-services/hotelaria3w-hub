INSERT INTO storage.buckets (id, name, public) VALUES ('orcamentos-marketing', 'orcamentos-marketing', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read on orcamentos-marketing" ON storage.objects FOR SELECT USING (bucket_id = 'orcamentos-marketing');
CREATE POLICY "Allow insert on orcamentos-marketing" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'orcamentos-marketing');
CREATE POLICY "Allow delete on orcamentos-marketing" ON storage.objects FOR DELETE USING (bucket_id = 'orcamentos-marketing');