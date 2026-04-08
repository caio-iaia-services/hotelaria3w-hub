-- Módulo Atendimento WhatsApp — tabelas base
-- Execute no Supabase SQL Editor

-- Contatos WhatsApp
CREATE TABLE IF NOT EXISTS contatos_whatsapp (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone        text NOT NULL UNIQUE,
  nome            text,
  tipo            text NOT NULL DEFAULT 'desconhecido' CHECK (tipo IN ('lead','cliente','fornecedor','desconhecido')),
  canal_atribuido text CHECK (canal_atribuido IN ('G1','G4','ADM')),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- Chats (sessão de conversa por contato × canal)
CREATE TABLE IF NOT EXISTS chats (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id         uuid NOT NULL REFERENCES contatos_whatsapp(id) ON DELETE CASCADE,
  canal              text NOT NULL DEFAULT 'IA' CHECK (canal IN ('IA','G1','G4','ADM')),
  status             text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','pausado','encerrado')),
  ia_ativa           boolean NOT NULL DEFAULT true,
  ultima_mensagem_em timestamptz,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

-- Mensagens
CREATE TABLE IF NOT EXISTS mensagens (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id   uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  origem    text NOT NULL CHECK (origem IN ('cliente','ia','humano')),
  conteudo  text NOT NULL,
  tipo      text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','audio','imagem','documento')),
  lida      boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Configurações do agente IA por canal
CREATE TABLE IF NOT EXISTS configuracoes_ia_atendimento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestao         text NOT NULL UNIQUE CHECK (gestao IN ('global','G1','G4','ADM')),
  prompt_sistema text,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Inserir configuração global padrão
INSERT INTO configuracoes_ia_atendimento (gestao, prompt_sistema, ativo)
VALUES (
  'global',
  'Você é um assistente virtual da 3W Hotelaria. Atenda com cordialidade, identifique o nome e necessidade do contato, e direcione para o setor correto (Gestão 1 - Hotelaria, Gestão 4 - Gastronomia, ADM - Administrativo).',
  true
)
ON CONFLICT (gestao) DO NOTHING;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_chats_contato      ON chats(contato_id);
CREATE INDEX IF NOT EXISTS idx_chats_canal        ON chats(canal);
CREATE INDEX IF NOT EXISTS idx_chats_status       ON chats(status);
CREATE INDEX IF NOT EXISTS idx_mensagens_chat     ON mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado   ON mensagens(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_contatos_telefone  ON contatos_whatsapp(telefone);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_contatos_atualizado
  BEFORE UPDATE ON contatos_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_chats_atualizado
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_config_ia_atualizado
  BEFORE UPDATE ON configuracoes_ia_atendimento
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- RLS: habilitar (ajustar policies conforme necessário)
ALTER TABLE contatos_whatsapp        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens                ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_ia_atendimento ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para autenticados (app usa service key via anon com JWT)
CREATE POLICY "Autenticados podem ler contatos"
  ON contatos_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir contatos"
  ON contatos_whatsapp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar contatos"
  ON contatos_whatsapp FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem ler chats"
  ON chats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir chats"
  ON chats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar chats"
  ON chats FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem ler mensagens"
  ON mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir mensagens"
  ON mensagens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar mensagens"
  ON mensagens FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem ler config IA"
  ON configuracoes_ia_atendimento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem gerenciar config IA"
  ON configuracoes_ia_atendimento FOR ALL TO authenticated USING (true);
