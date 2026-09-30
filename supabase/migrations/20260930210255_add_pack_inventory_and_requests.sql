-- Estoque fisico de packs, historico de movimentacoes e fila de solicitacoes.
ALTER TABLE public.packs
  ADD COLUMN IF NOT EXISTS saldo_atual INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'packs_saldo_atual_nonnegative_check'
      AND conrelid = 'public.packs'::regclass
  ) THEN
    ALTER TABLE public.packs
      ADD CONSTRAINT packs_saldo_atual_nonnegative_check CHECK (saldo_atual >= 0);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.pack_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  saldo_resultante INTEGER NOT NULL CHECK (saldo_resultante >= 0),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pack_movimentacoes_pack_created_idx
  ON public.pack_movimentacoes (pack_id, created_at DESC);

ALTER TABLE public.pack_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to pack_movimentacoes" ON public.pack_movimentacoes;
CREATE POLICY "Allow all access to pack_movimentacoes"
  ON public.pack_movimentacoes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.estoque_solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finalidade TEXT NOT NULL CHECK (finalidade IN ('reposicao', 'consumo')),
  alvo_tipo TEXT NOT NULL CHECK (alvo_tipo IN ('item', 'pack', 'livre')),
  item_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
  pack_id UUID REFERENCES public.packs(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade TEXT NOT NULL DEFAULT 'unidade',
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'atendida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT estoque_solicitacoes_alvo_check CHECK (
    (alvo_tipo = 'item' AND item_id IS NOT NULL AND pack_id IS NULL)
    OR (alvo_tipo = 'pack' AND pack_id IS NOT NULL AND item_id IS NULL)
    OR (alvo_tipo = 'livre' AND item_id IS NULL AND pack_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS estoque_solicitacoes_status_created_idx
  ON public.estoque_solicitacoes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS estoque_solicitacoes_item_id_idx
  ON public.estoque_solicitacoes (item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS estoque_solicitacoes_pack_id_idx
  ON public.estoque_solicitacoes (pack_id) WHERE pack_id IS NOT NULL;

ALTER TABLE public.estoque_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to estoque_solicitacoes" ON public.estoque_solicitacoes;
CREATE POLICY "Allow all access to estoque_solicitacoes"
  ON public.estoque_solicitacoes FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_estoque_solicitacoes_updated_at ON public.estoque_solicitacoes;
CREATE TRIGGER update_estoque_solicitacoes_updated_at
  BEFORE UPDATE ON public.estoque_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.movimentar_pack(
  p_pack_id UUID,
  p_tipo TEXT,
  p_quantidade INTEGER,
  p_observacao TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_saldo INTEGER;
  v_componentes INTEGER;
  v_insuficientes TEXT;
BEGIN
  IF p_tipo NOT IN ('entrada', 'saida') THEN
    RAISE EXCEPTION 'Tipo de movimentacao invalido';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero';
  END IF;

  SELECT saldo_atual INTO v_saldo
  FROM public.packs
  WHERE id = p_pack_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack nao encontrado';
  END IF;

  IF p_tipo = 'entrada' THEN
    SELECT count(*) INTO v_componentes
    FROM public.pack_itens
    WHERE pack_id = p_pack_id;

    IF v_componentes = 0 THEN
      RAISE EXCEPTION 'Adicione itens ao pack antes de montar unidades';
    END IF;

    -- Bloqueio em ordem deterministica evita duas montagens concorrentes
    -- consumirem o mesmo componente ou entrarem em deadlock.
    PERFORM 1
    FROM public.estoque_itens ei
    JOIN public.pack_itens pi ON pi.item_id = ei.id
    WHERE pi.pack_id = p_pack_id
    ORDER BY ei.id
    FOR UPDATE OF ei;

    SELECT string_agg(ei.nome, ', ' ORDER BY ei.nome) INTO v_insuficientes
    FROM public.pack_itens pi
    JOIN public.estoque_itens ei ON ei.id = pi.item_id
    WHERE pi.pack_id = p_pack_id
      AND ei.saldo_atual < pi.quantidade * p_quantidade;

    IF v_insuficientes IS NOT NULL THEN
      RAISE EXCEPTION 'Estoque insuficiente para: %', v_insuficientes;
    END IF;

    UPDATE public.estoque_itens ei
    SET saldo_atual = ei.saldo_atual - (pi.quantidade * p_quantidade)
    FROM public.pack_itens pi
    WHERE pi.pack_id = p_pack_id
      AND pi.item_id = ei.id;

    v_saldo := v_saldo + p_quantidade;
  ELSE
    IF v_saldo < p_quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente: existem apenas % pack(s)', v_saldo;
    END IF;
    v_saldo := v_saldo - p_quantidade;
  END IF;

  UPDATE public.packs SET saldo_atual = v_saldo WHERE id = p_pack_id;

  INSERT INTO public.pack_movimentacoes
    (pack_id, tipo, quantidade, saldo_resultante, observacao)
  VALUES
    (p_pack_id, p_tipo, p_quantidade, v_saldo, NULLIF(trim(p_observacao), ''));

  RETURN v_saldo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.movimentar_pack(UUID, TEXT, INTEGER, TEXT) TO anon, authenticated;
