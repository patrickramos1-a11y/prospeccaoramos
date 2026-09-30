-- Link externo para compra ou reposicao do item de estoque.
ALTER TABLE public.estoque_itens
  ADD COLUMN IF NOT EXISTS compra_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'estoque_itens_compra_url_http_check'
      AND conrelid = 'public.estoque_itens'::regclass
  ) THEN
    ALTER TABLE public.estoque_itens
      ADD CONSTRAINT estoque_itens_compra_url_http_check
      CHECK (compra_url IS NULL OR compra_url ~* '^https?://');
  END IF;
END
$$;
