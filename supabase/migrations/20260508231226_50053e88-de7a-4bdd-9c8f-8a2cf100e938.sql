
-- Tabela de usuarios (responsaveis internos)
CREATE TABLE public.usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cargo TEXT NOT NULL DEFAULT '',
  cor TEXT NOT NULL DEFAULT '#10b981',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de visitas
CREATE TABLE public.visitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio_id UUID,
  orgao_id UUID,
  responsavel_id UUID,
  data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME,
  tipo TEXT NOT NULL DEFAULT 'Primeira abordagem',
  status TEXT NOT NULL DEFAULT 'planejada',
  observacoes TEXT NOT NULL DEFAULT '',
  custo_total NUMERIC NOT NULL DEFAULT 0,
  progresso INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to visitas" ON public.visitas FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_visitas_updated_at BEFORE UPDATE ON public.visitas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Kits da visita
CREATE TABLE public.visita_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visita_id UUID NOT NULL,
  kit_id UUID NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_unitario_snapshot NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visita_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to visita_kits" ON public.visita_kits FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_visita_kits_visita ON public.visita_kits(visita_id);

-- Checklist da visita
CREATE TABLE public.visita_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visita_id UUID NOT NULL,
  step_id INTEGER NOT NULL,
  step_titulo TEXT NOT NULL,
  item_key TEXT NOT NULL,
  texto TEXT NOT NULL,
  feito BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visita_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to visita_checklist" ON public.visita_checklist FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_visita_checklist_visita ON public.visita_checklist(visita_id);
