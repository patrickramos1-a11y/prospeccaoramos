## Refatoramento de UI/UX, design e responsividade

Refinar a plataforma mantendo o DNA visual (Verde Mata + Âmbar, Syne/Inter), elevando densidade, hierarquia, polimento e excelência tanto em mobile quanto em desktop. Animações sutis com `framer-motion`/Tailwind.

### 1. Design system (refinar tokens)
`src/index.css` e `tailwind.config.ts`:
- Escala tipográfica consistente (display 2xl→4xl, body 13/14/15) com `clamp()` para fluidez.
- Tokens de **espaçamento responsivo** (`--space-section`, `--space-card`).
- Sombras refinadas em 4 níveis (`--shadow-xs/sm/md/lg`) com cor de marca.
- Gradientes sutis para cards de destaque, glassmorphism leve em headers.
- Variáveis para **safe-area iOS** (`env(safe-area-inset-*)`).
- Helpers: `.surface-card`, `.surface-elevated`, `.text-gradient`, `.glass`.

### 2. Shell (AppLayout) — navegação responsiva
Refatorar `src/components/AppLayout.tsx`:
- **Desktop**: sidebar refinada com seções agrupadas (Operação / Inteligência / Sistema), estado colapsado (w-16, só ícones, tooltip) e expandido (w-64), persistência em `localStorage`.
- **Mobile**: 
  - **Bottom tab bar fixa** com 5 itens principais (Dashboard, Visitas, Municípios, Estoque, Mais) + safe-area.
  - Sheet "Mais" abrindo o restante do menu.
  - Topbar slim com título dinâmico + ações contextuais.
- Transições suaves (slide/fade), focus-ring acessível, tap targets ≥44px.
- Indicador de página ativa com barrinha lateral animada.

### 3. Padrões de páginas (PageHeader + sections)
Criar `src/components/PageHeader.tsx` reutilizável: título, subtítulo, ações primárias (responsivas — botões viram FAB no mobile), filtros colapsáveis em sheet. Padronizar todas as páginas (Dashboard, Municípios, Visitas, Estoque, Kits, Contatos, Financeiro, Inteligência, Configurações).

### 4. Componentes de dados (mobile-friendly)
Criar `src/components/DataTable.tsx` e `src/components/ResponsiveList.tsx`:
- **Desktop**: tabela densa com sticky header, hover, ordenação.
- **Mobile**: vira lista de cards com hierarquia clara (título + meta + ações). 
- Estados padronizados: loading skeleton, empty state ilustrado, error com retry.
- Aplicar em Municípios, Visitas, Estoque, Contatos, Órgãos, Kits.

### 5. Formulários e Sheets
- `Sheet` lateral no desktop, **drawer/bottom-sheet no mobile** (usar `Drawer` do shadcn ou `Sheet` com `side="bottom"`).
- Inputs com `h-11` no mobile, `h-10` no desktop (toques confortáveis).
- Labels acima do campo, helper text e erros visualmente claros.
- Submit fixo no rodapé do sheet no mobile.
- Padronizar `VisitaFormSheet`, `ContatoFormSheet`, `UsuarioFormSheet`, `EstoqueDocumentosManager`.

### 6. Dashboard e gráficos
- Refinar `Dashboard.tsx`: KPIs com micro-spark de tendência, hierarquia visual aprimorada, cards com gradiente sutil em destaques.
- `Inteligencia.tsx` e `Financeiro.tsx`: gráficos com `ResponsiveContainer`, paleta unificada, tooltip elegante, legendas legíveis em mobile (rotacionar XAxis, reduzir labels).
- Empty states e loading com skeletons coerentes.

### 7. Micro-animações (moderadas)
- `animate-fade-in` ao montar páginas (já existe; padronizar).
- Stagger nos cards de KPI/lista (delay incremental).
- Hover/press states com `transition-all duration-200`.
- Sheet/drawer com easing refinado.
- Sidebar collapse com `transition-[width]`.

### 8. Acessibilidade e qualidade
- `aria-label` em todos botões só-ícone.
- Foco visível (`focus-visible:ring-2`).
- Tap targets ≥44px no mobile.
- `<main>` único por página.
- Contraste verificado em tokens.

### Arquivos principais afetados
- `src/index.css`, `tailwind.config.ts` (tokens)
- `src/components/AppLayout.tsx` (shell)
- **Novos**: `PageHeader.tsx`, `MobileBottomNav.tsx`, `EmptyState.tsx`, `LoadingState.tsx`
- Todas as páginas em `src/pages/*` (aplicar PageHeader + responsividade)
- Sheets de formulário (refinar mobile)

### Fora de escopo
- Mudança de paleta/tipografia.
- Refatoração de lógica de negócio.
- PWA / modo offline (pode ser próxima etapa).
- Internacionalização.

### Execução em fases (mesma sessão)
1. Tokens + Shell (sidebar refinada + bottom-nav mobile)
2. PageHeader + EmptyState/Loading reutilizáveis
3. Aplicar em todas as páginas (responsividade + densidade)
4. Refinar sheets/formulários (mobile drawers)
5. Polir dashboards/gráficos

Posso seguir com a implementação?
