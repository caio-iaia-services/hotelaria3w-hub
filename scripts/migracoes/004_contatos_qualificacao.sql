-- Modulo CONTATOS — campo de qualificacao
-- Executar no Supabase SQL Editor

ALTER TABLE contatos ADD COLUMN IF NOT EXISTS qualificacao text NOT NULL DEFAULT 'cadastrado';

-- Valores: cadastrado, higienizado, aquecido, em_prospeccao,
--          ativo_super, ativo_interessado, ativo_em_observacao, inativo
