-- Remove prefixo de CNPJ do início de nome_fantasia e razao_social
-- Padrão gerado por exportações do gov.br para MEI/empresário individual
-- Ex: "66.179.808 YURY DAVID LIMA" → "YURY DAVID LIMA"
-- Ex: "66.192.760/0001-56 NOME LTDA" → "NOME LTDA"

UPDATE clientes
SET nome_fantasia = trim(regexp_replace(nome_fantasia, '^\d[\d.\-/]{5,}\s+', ''))
WHERE nome_fantasia ~ '^\d[\d.\-/]{5,}\s+\S';

UPDATE clientes
SET razao_social = trim(regexp_replace(razao_social, '^\d[\d.\-/]{5,}\s+', ''))
WHERE razao_social ~ '^\d[\d.\-/]{5,}\s+\S';
