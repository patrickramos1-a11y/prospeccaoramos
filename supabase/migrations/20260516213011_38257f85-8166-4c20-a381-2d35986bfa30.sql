
-- Bucket público para documentos do estoque
INSERT INTO storage.buckets (id, name, public)
VALUES ('estoque-documentos', 'estoque-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas no bucket
CREATE POLICY "Public read estoque-documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'estoque-documentos');

CREATE POLICY "Public insert estoque-documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'estoque-documentos');

CREATE POLICY "Public update estoque-documentos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'estoque-documentos');

CREATE POLICY "Public delete estoque-documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'estoque-documentos');

-- Tabela de documentos anexados a itens de estoque
CREATE TABLE public.estoque_itens_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  arquivo_url TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  tipo_mime TEXT NOT NULL DEFAULT '',
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estoque_itens_documentos_item_id ON public.estoque_itens_documentos(item_id);

ALTER TABLE public.estoque_itens_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to estoque_itens_documentos"
ON public.estoque_itens_documentos
FOR ALL
USING (true)
WITH CHECK (true);
