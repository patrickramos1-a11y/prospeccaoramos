
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT '',
  descricao TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  montados INTEGER NOT NULL DEFAULT 0,
  disponiveis INTEGER NOT NULL DEFAULT 0,
  usados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to kits" ON public.kits FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON public.kits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kit_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kit_id, item_id)
);

ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to kit_itens" ON public.kit_itens FOR ALL USING (true) WITH CHECK (true);
