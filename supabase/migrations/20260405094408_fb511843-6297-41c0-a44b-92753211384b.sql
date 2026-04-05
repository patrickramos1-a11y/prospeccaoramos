
-- 1. Create pack_itens junction table for multi-item packs
CREATE TABLE public.pack_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pack_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pack_itens" ON public.pack_itens FOR ALL USING (true) WITH CHECK (true);

-- 2. Remove item_id and quantidade from packs (now in pack_itens)
ALTER TABLE public.packs DROP COLUMN item_id;
ALTER TABLE public.packs DROP COLUMN quantidade;

-- 3. Add imagem_url to estoque_itens
ALTER TABLE public.estoque_itens ADD COLUMN imagem_url TEXT;

-- 4. Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

CREATE POLICY "Anyone can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Anyone can upload item images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "Anyone can update item images" ON storage.objects FOR UPDATE USING (bucket_id = 'item-images');
CREATE POLICY "Anyone can delete item images" ON storage.objects FOR DELETE USING (bucket_id = 'item-images');

-- 5. Fix kit_itens: add item_type and drop restrictive FK
ALTER TABLE public.kit_itens ADD COLUMN item_type TEXT NOT NULL DEFAULT 'item';
ALTER TABLE public.kit_itens DROP CONSTRAINT IF EXISTS kit_itens_item_id_fkey;
