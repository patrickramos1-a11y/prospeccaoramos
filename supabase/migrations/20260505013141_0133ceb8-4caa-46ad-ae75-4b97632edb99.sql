CREATE TABLE public.municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  estado TEXT NOT NULL,
  regiao TEXT DEFAULT '',
  ibge_codigo TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'não iniciado',
  prioridade TEXT NOT NULL DEFAULT 'média',
  responsavel TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  abertura INTEGER NOT NULL DEFAULT 0,
  potencial INTEGER NOT NULL DEFAULT 0,
  relacionamento INTEGER NOT NULL DEFAULT 0,
  facilidade INTEGER NOT NULL DEFAULT 0,
  ultima_visita DATE,
  has_cliente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to municipios"
ON public.municipios
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_municipios_updated_at
BEFORE UPDATE ON public.municipios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();