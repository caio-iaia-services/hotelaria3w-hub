-- Normaliza nomes de cidades na tabela clientes para Title Case,
-- preservando preposições minúsculas (de, da, do, das, dos, e).
-- Exemplo: "SAO PAULO" → "São Paulo", "rio de janeiro" → "Rio de Janeiro"

CREATE OR REPLACE FUNCTION title_case_cidade(s TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  palavras TEXT[];
  preps TEXT[] := ARRAY['de','da','do','das','dos','e','o','a','os','as'];
  resultado TEXT[];
  i INT;
  p TEXT;
BEGIN
  palavras := string_to_array(lower(trim(s)), ' ');
  FOR i IN 1..array_length(palavras, 1) LOOP
    p := palavras[i];
    IF i = 1 OR NOT (p = ANY(preps)) THEN
      p := upper(substring(p, 1, 1)) || substring(p, 2);
    END IF;
    resultado := array_append(resultado, p);
  END LOOP;
  RETURN array_to_string(resultado, ' ');
END;
$$;

-- Aplica apenas onde a cidade existe e está diferente do title case
UPDATE clientes
SET cidade = title_case_cidade(cidade)
WHERE cidade IS NOT NULL
  AND cidade <> ''
  AND cidade <> title_case_cidade(cidade);

-- Remove a função auxiliar após uso
DROP FUNCTION title_case_cidade(TEXT);
