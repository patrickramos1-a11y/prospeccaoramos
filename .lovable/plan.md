## Aba Dashboard — visão geral com dados reais

Reescrever `src/pages/Dashboard.tsx` substituindo todos os mocks (`MUNICIPIOS`, `VISITAS`, `ALERTAS`, `ESTOQUE_ITENS`, `KITS`) por dados reais do banco.

### Seções

**1. Header**
Título + subtítulo dinâmico ("Atualizado agora" com hora real).

**2. Alertas críticos (banner vermelho, condicional)**
Calculados em tempo real:
- Visitas planejadas vencidas (data < hoje, status = planejada)
- Estoque abaixo do mínimo
- Municípios alta prioridade sem visita há > 30 dias

**3. KPIs (4 cards)**
- Municípios cadastrados (+ "X visitados · Y em andamento")
- Visitas realizadas no mês (+ planejadas/em andamento)
- Contatos cadastrados (+ decisores via `nivel`)
- Investimento total no mês (soma `custo_total`)

**4. Municípios por Status (col-span-2)**
- Barra de progresso proporcional aos status reais
- Grid 2x2 com contagens
- Top 4 por score (lista com responsável, score, status)

**5. Próximas visitas (sidebar)**
Top 4 com `status ∈ {planejada, em andamento}`, ordenadas por `data_visita asc`. Mostra município (via join), data e responsável.

**6. Estoque crítico (sidebar)**
Itens onde `saldo_atual < minimo`, com barra de progresso. Lista os 4 kits com mais montados (`kits.disponiveis`).

**7. Alertas e pendências**
Lista consolidada das pendências calculadas (3 categorias acima), com cor por urgência e link de ação para a rota correspondente.

### Técnico
- Buscas paralelas: `municipios`, `visitas`, `contatos`, `estoque_itens`, `kits`, `usuarios`.
- Agregações via `useMemo`.
- Loading skeleton.
- Links reais (`<Link to="/municipios">`) substituindo `<a href>`.
- Cores via tokens semânticos do design system.
- Empty states em cada bloco quando vazio.

### Fora de escopo
- Sistema persistente de alertas em banco.
- Gráficos avançados (mantidos para Inteligência).

Posso seguir com a implementação?
