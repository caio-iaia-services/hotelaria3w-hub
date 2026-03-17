ALTER TABLE public.fornecedores 
  ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#C8962E',
  ADD COLUMN IF NOT EXISTS cor_secundaria text DEFAULT '#1a4168';