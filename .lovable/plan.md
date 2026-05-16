## Aba Financeiro — controle real com dados do banco

Reescrever `src/pages/Financeiro.tsx` para usar **somente** dados reais (visitas, visita_kits, kits, estoque_itens, municipios, usuarios). Sem mock.

### Filtros (topo)
- Período: 30d / 90d / 12m / Tudo (sobre `visitas.data_visita`)
- Estado (UF) — via `municipios.estado`
- Responsável — via `usuarios`

### Seções

**1. KPIs (4 cards)**
- Total Investido (soma `visitas.custo_total` no período)
- Média por Visita (apenas concluídas com custo > 0)
- Custo em Kits/Materiais (soma `visita_kits.quantidade × custo_unitario_snapshot`)
- Visitas com custo lançado / total de visitas concluídas

**2. Evolução mensal do investimento** (AreaChart)
Agrupado por mês a partir de `visitas.data_visita`, últimos 12 meses (ou período filtrado).

**3. Custo por município** (BarChart horizontal, top 10)
Soma de `custo_total` por município. Tooltip mostra nº de visitas.

**4. Custo por tipo de visita** (PieChart/donut)
Agrupado por `visitas.tipo`.

**5. Custo por responsável** (BarChart)
Soma por `responsavel_id` → join com `usuarios.nome` e cor.

**6. Tabela "Custo por Visita"**
Colunas: Município/UF, Data, Tipo, Responsável, Kits usados (nomes via join), Custo Total. Ordenada por data desc. Linha final com total geral.

**7. Composição dos custos** (barras de progresso)
- Materiais/Kits (calculado de `visita_kits`)
- Operação (custo_total − materiais)
Percentuais reais sobre o total do período.

**8. Alerta de visitas sem custo**
Conta visitas com `status='concluída'` e `custo_total=0` no período; mostra card de aviso com CTA "ver visitas".

### Estados de vazio
Cada card mostra placeholder "Sem dados no período" quando vazio.

### Técnico
- Buscas paralelas: `visitas` (com `municipio_id`, `responsavel_id`), `visita_kits` (join `kits`), `municipios`, `usuarios`.
- Agregações via `useMemo`.
- Recharts + tokens HSL do design system (`--primary`, `--accent`, `--status-visited`, etc).
- Loading skeleton; responsivo (mobile 1 col, desktop 2 cols).

### Fora de escopo
- CRUD/edição de custos (feito no formulário de visita).
- Orçamento/meta financeira.
- Exportação para Excel/PDF.

Posso seguir com a implementação?
