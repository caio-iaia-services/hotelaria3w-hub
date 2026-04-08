-- Normaliza CNPJs existentes: remove pontuação, deixa só dígitos
UPDATE clientes
SET cnpj = regexp_replace(cnpj, '\D', '', 'g')
WHERE cnpj IS NOT NULL
  AND cnpj ~ '\D';
