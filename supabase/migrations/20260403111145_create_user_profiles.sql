-- Tabela de perfis de usuário com controle de acesso por gestão e módulos
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'comercial' CHECK (role IN ('admin', 'comercial', 'tecnico')),
  gestao TEXT DEFAULT NULL, -- null = acesso a todas as gestões
  modulos TEXT[] NOT NULL DEFAULT ARRAY['dashboard','oportunidades','crm','orcamentos','acoes_comerciais','clientes','atendimento','fornecedores'],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to user_profiles"
  ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- Perfis iniciais dos usuários cadastrados
INSERT INTO public.user_profiles (id, email, nome, role, gestao, modulos)
SELECT id, email, 'Celso', 'admin', null,
  ARRAY['dashboard','oportunidades','crm','orcamentos','acoes_comerciais','clientes','atendimento','fornecedores','marketing','financeiro','planejamento','admin','admin_usuarios']
FROM auth.users WHERE email = 'celso@3whotelaria.com.br'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, email, nome, role, gestao, modulos)
SELECT id, email, 'SAC / Técnico', 'admin', null,
  ARRAY['dashboard','oportunidades','crm','orcamentos','acoes_comerciais','clientes','atendimento','fornecedores','marketing','financeiro','planejamento','admin','admin_usuarios']
FROM auth.users WHERE email = 'sac@3whotelaria.com.br'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, email, nome, role, gestao, modulos)
SELECT id, email, 'Fabiano', 'comercial', 'G1',
  ARRAY['dashboard','oportunidades','crm','orcamentos','acoes_comerciais','clientes','atendimento','fornecedores']
FROM auth.users WHERE email = 'comercial1@3whotelaria.com.br'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, email, nome, role, gestao, modulos)
SELECT id, email, 'Alex', 'comercial', 'G4',
  ARRAY['dashboard','oportunidades','crm','orcamentos','acoes_comerciais','clientes','atendimento','fornecedores']
FROM auth.users WHERE email = 'comercial4@3whotelaria.com.br'
ON CONFLICT (id) DO NOTHING;
