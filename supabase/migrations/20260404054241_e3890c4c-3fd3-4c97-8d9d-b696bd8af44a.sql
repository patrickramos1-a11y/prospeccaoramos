
-- Create estoque_itens table
CREATE TABLE public.estoque_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Brinde',
  unidade TEXT NOT NULL DEFAULT 'unidade',
  saldo_atual INTEGER NOT NULL DEFAULT 0,
  minimo INTEGER NOT NULL DEFAULT 0,
  ideal INTEGER NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  fornecedor TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create packs table (conjunto de itens, ex: "Pack 10 Cartões")
CREATE TABLE public.packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

-- Open access policies (no auth required for now)
CREATE POLICY "Allow all access to estoque_itens" ON public.estoque_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to packs" ON public.packs FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_estoque_itens_updated_at
  BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packs_updated_at
  BEFORE UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
