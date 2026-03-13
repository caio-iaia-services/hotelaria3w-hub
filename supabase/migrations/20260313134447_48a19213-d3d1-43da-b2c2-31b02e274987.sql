CREATE TABLE public.usuarios_email_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  senha_smtp TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'smtp.hostinger.com',
  port INTEGER NOT NULL DEFAULT 465,
  secure BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.usuarios_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email config"
  ON public.usuarios_email_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);