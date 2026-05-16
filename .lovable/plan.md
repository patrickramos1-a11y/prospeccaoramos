## Aba Inteligência — dashboard estratégico com dados reais

Reescrever `src/pages/Inteligencia.tsx` para usar **somente** dados do banco (municípios, visitas, visita_kits, contatos, órgãos, usuários). Sem mock.

### Seções da página

**1. KPIs no topo (4 cards)**
- Score médio dos municípios (0–20)
- Total de visitas concluídas / planejadas
- Custo total acumulado (soma de `visitas.custo_total`)
- Custo médio por visita concluída

**2. Distribuição por status das visitas** (donut)
Planejadas, em andamento, concluídas — usando `visitas.status`.

**3. Score estratégico — Top 10 municípios** (bar chart)
`municipios.score` ordenado desc, top 10. Tooltip mostra Abertura/Potencial/Relacionamento/Facilidade.

**4. Perfil médio territorial** (radar)
Médias reais de `abertura`, `potencial`, `relacionamento`, `facilidade` em escala 0–5.

**5. Mapa de calor por Estado/Região**
- Grade de cards por UF com: nº municípios, score médio, visitas concluídas, custo total.
- Cor de fundo do card proporcional ao score médio (verde mais forte = score maior) usando tokens semânticos (`bg-primary/X`).
- Ordenado por score médio desc.

**6. Análise financeira / ROI**
- **Custo por município** (bar horizontal): soma de `visitas.custo_total` por município, top 8.
- **Eficiência (custo × score)** (scatter): eixo X = custo total, eixo Y = score; cada ponto = município. Ajuda a ver municípios "caros e fracos" vs "baratos e fortes".
- **Custo por tipo de visita** (bar): agrupado por `visitas.tipo`.

**7. Ranking estratégico** (tabela)
Mantém o ranking atual, mas alimentado pelo banco. Colunas: #, Município/UF, Score, Abertura, Potencial, Relacionamento, Custo total (calculado), Nº visitas, Prioridade.

### Filtros no topo
- Filtro por **Estado** (UF) — afeta todos os gráficos/tabela.
- Filtro por **período** das visitas (Últimos 30d / 90d / 12m / Tudo).

### Estados de vazio
Cada card mostra placeholder ("Sem dados ainda") quando não houver registros, em vez de gráfico em branco.

### Detalhes técnicos
- Usar `useEffect` + `supabase.from(...).select(...)` para buscar paralelamente: `municipios`, `visitas`, `visita_kits`, `contatos`.
- Agregações feitas no cliente (volume baixo) com `useMemo`.
- Recharts já está no projeto; reutilizar `BarChart`, `PieChart`, `RadarChart`, `ScatterChart`.
- Cores via tokens HSL do design system (`--primary`, `--accent`, `--status-visited`, etc.).
- Loading skeleton enquanto carrega.
- Responsivo: 2 colunas no mobile (KPIs), 1 coluna por gráfico; 2 colunas no desktop (`lg:`).

### Fora de escopo
- Recomendações com IA (deixado para uma próxima iteração).
- Mapa geográfico real (SVG/Mapbox) — usaremos grade por UF.
- Edição/CRUD nesta tela (apenas leitura analítica).

Posso seguir com a implementação?