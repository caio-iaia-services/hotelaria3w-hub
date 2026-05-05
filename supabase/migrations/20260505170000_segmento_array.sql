-- Converte clientes.segmento de TEXT para TEXT[]
-- Preserva valores existentes dentro de um array de um elemento
ALTER TABLE clientes
  ALTER COLUMN segmento TYPE text[]
  USING CASE
    WHEN segmento IS NOT NULL AND trim(segmento) <> ''
    THEN ARRAY[trim(segmento)]
    ELSE NULL
  END;
