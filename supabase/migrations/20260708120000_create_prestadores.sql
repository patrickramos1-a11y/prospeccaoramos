CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  confianca TEXT NOT NULL DEFAULT 'comum',
  avaliacao INTEGER NOT NULL DEFAULT 0 CHECK (avaliacao >= 0 AND avaliacao <= 5),
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  site TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  servicos TEXT NOT NULL DEFAULT '',
  prazo_medio TEXT NOT NULL DEFAULT '',
  forma_pagamento TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prestador_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  whatsapp BOOLEAN NOT NULL DEFAULT false,
  email TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestador_contatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to prestadores" ON public.prestadores;
CREATE POLICY "Allow all access to prestadores"
  ON public.prestadores
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to prestador_contatos" ON public.prestador_contatos;
CREATE POLICY "Allow all access to prestador_contatos"
  ON public.prestador_contatos
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_prestadores_updated_at ON public.prestadores;
CREATE TRIGGER trg_prestadores_updated_at
  BEFORE UPDATE ON public.prestadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_prestadores_categoria ON public.prestadores(categoria);
CREATE INDEX IF NOT EXISTS idx_prestadores_status ON public.prestadores(status);
CREATE INDEX IF NOT EXISTS idx_prestadores_confianca ON public.prestadores(confianca);
CREATE INDEX IF NOT EXISTS idx_prestadores_cidade_estado ON public.prestadores(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_prestador_contatos_prestador_id ON public.prestador_contatos(prestador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestadores TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestador_contatos TO anon, authenticated, service_role;
