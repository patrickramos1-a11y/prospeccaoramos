
-- Contatos
CREATE TABLE public.contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cargo text NOT NULL DEFAULT '',
  nivel text NOT NULL DEFAULT 'Básico',
  municipio_id uuid REFERENCES public.municipios(id) ON DELETE SET NULL,
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  whatsapp boolean NOT NULL DEFAULT false,
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contatos" ON public.contatos FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_contatos_updated_at
BEFORE UPDATE ON public.contatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contatos_municipio ON public.contatos(municipio_id);

-- Órgãos
CREATE TABLE public.orgaos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT '',
  estado text NOT NULL,
  municipio_id uuid REFERENCES public.municipios(id) ON DELETE CASCADE,
  endereco text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orgaos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orgaos" ON public.orgaos FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_orgaos_updated_at
BEFORE UPDATE ON public.orgaos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orgaos_municipio ON public.orgaos(municipio_id);
CREATE INDEX idx_orgaos_estado ON public.orgaos(estado);

-- Junção
CREATE TABLE public.orgao_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orgao_id uuid NOT NULL REFERENCES public.orgaos(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_id, contato_id)
);

ALTER TABLE public.orgao_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orgao_contatos" ON public.orgao_contatos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_orgao_contatos_orgao ON public.orgao_contatos(orgao_id);
CREATE INDEX idx_orgao_contatos_contato ON public.orgao_contatos(contato_id);
