-- Campo de observações livre no modal de tarefas
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS observacoes text;
