
-- Tabela clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia text NOT NULL,
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  email text,
  telefone text,
  cidade text,
  estado text,
  segmento_id text,
  segmento text,
  status text NOT NULL DEFAULT 'ativo',
  tipo text NOT NULL DEFAULT 'cliente',
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cep text,
  pais text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

-- Tabela crm_cards
CREATE TABLE public.crm_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid,
  cliente_id uuid NOT NULL,
  operacao text NOT NULL,
  gestao text NOT NULL,
  estagio text NOT NULL DEFAULT 'lead',
  cliente_nome text NOT NULL,
  cliente_cnpj text NOT NULL,
  cliente_cidade text NOT NULL DEFAULT '',
  cliente_estado text NOT NULL DEFAULT '',
  cliente_segmento text,
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  substituida boolean DEFAULT false,
  operacao_nova text,
  data_substituicao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to crm_cards" ON public.crm_cards FOR ALL USING (true) WITH CHECK (true);

-- Tabela documentos_comerciais
CREATE TABLE public.documentos_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.crm_cards(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid NOT NULL,
  tipo text NOT NULL,
  numero text,
  titulo text NOT NULL,
  arquivo_nome text,
  arquivo_url text,
  google_drive_id text,
  conteudo jsonb,
  valor_total numeric,
  moeda text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'rascunho',
  enviado_em timestamptz,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to documentos_comerciais" ON public.documentos_comerciais FOR ALL USING (true) WITH CHECK (true);

-- Tabela acoes_comerciais_log
CREATE TABLE public.acoes_comerciais_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.crm_cards(id) ON DELETE CASCADE NOT NULL,
  documento_id uuid,
  acao text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acoes_comerciais_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to acoes_comerciais_log" ON public.acoes_comerciais_log FOR ALL USING (true) WITH CHECK (true);

-- Foreign keys para orcamentos
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.crm_cards(id);
