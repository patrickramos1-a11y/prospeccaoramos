## Cadastro de Visitas + Gestão de Usuários

Atualmente a página `Visitas.tsx` usa dados mockados (`VISITAS` de `mockData`). Vamos persistir tudo no Lovable Cloud, criar o fluxo de cadastro completo e introduzir a tela de Configurações com gestão de usuários (responsáveis).

---

### Etapa 1 — Banco de dados (migrations)

**1.1 Tabela `usuarios`** (responsáveis pelas visitas — perfis internos da equipe, não auth.users)
- `nome`, `email`, `telefone`, `cargo`, `cor` (para avatar), `ativo` (boolean)

**1.2 Tabela `visitas`**
- `municipio_id` (FK lógica → municipios)
- `orgao_id` (FK lógica → orgaos)
- `responsavel_id` (FK lógica → usuarios)
- `data_visita` (date), `hora` (time, opcional)
- `tipo` (text: "Primeira abordagem", "Coleta documental", "Follow-up", "Entrega")
- `status` (text: "planejada", "em_andamento", "concluida", "cancelada")
- `observacoes` (text)
- `custo_total` (numeric, calculado a partir dos kits)
- `progresso` (int, % checklist)

**1.3 Tabela `visita_kits`** (relação N:N visita ↔ kits, com snapshot de custo)
- `visita_id`, `kit_id`, `quantidade`, `custo_unitario_snapshot`

**1.4 Tabela `visita_checklist`** (estado do checklist por visita)
- `visita_id`, `step_id`, `item_id`, `texto`, `feito` (bool)

RLS: liberada (`true`) seguindo padrão atual do projeto. Triggers `updated_at`.

---

### Etapa 2 — Página de Configurações (nova)

- Nova rota `/configuracoes` + item no `Sidebar` (ícone Settings, abaixo de Financeiro).
- Página `Configuracoes.tsx` com abas (tabs):
  - **Usuários** (foco desta entrega): listagem, busca, botão "Novo Usuário", editar/desativar.
  - Espaço para futuras abas (Preferências, Integrações).
- Componente `UsuarioFormSheet.tsx` (Sheet lateral) — mesmo padrão do `ContatoFormSheet`: nome, email, telefone, cargo, cor, ativo.

---

### Etapa 3 — Cadastro de Visitas

**3.1 Componente `VisitaFormSheet.tsx`** (Sheet lateral, mobile-first), campos em ordem:

1. **Estado** (select — derivado dos estados existentes em `municipios`)
2. **Município** (select filtrado pelo estado)
3. **Órgão** (select filtrado pelo município escolhido; mostra nome + sigla)
4. **Tipo de visita** (select)
5. **Data** (date picker) + **Hora** (opcional)
6. **Responsável** (select de `usuarios` ativos; com link "Cadastrar responsável" → abre `UsuarioFormSheet`)
7. **Kits** (multi-seleção com quantidade): lista de `kits` ativos com `disponiveis > 0`, mostrando custo unitário (calculado a partir de `kit_itens` × `estoque_itens.custo_unitario`). Exibe **custo total da visita** somando linha a linha.
8. **Observações**

Validação com `zod`. Ao salvar: insert em `visitas` + insert em `visita_kits` (com snapshot de custo) + seed do `visita_checklist` a partir do template `CHECKLIST_STEPS` atual.

**3.2 Refatorar `Visitas.tsx`**
- Remover dependência de `mockData.VISITAS`; carregar via `supabase.from('visitas').select(...)` com joins (município, órgão, responsável).
- Botão "+ Nova Visita" abre `VisitaFormSheet`.
- Painel de detalhes à direita: ler checklist da tabela, atualizar `feito` no banco, recalcular `progresso` na visita.
- Mostrar custo total e kits vinculados.
- Agrupamento por status (planejada / em andamento / concluída) mantido.

---

### Etapa 4 — Ajustes complementares

- Atualizar `Sidebar` (badge de contagem para Visitas se aplicável).
- Custo das visitas alimenta a página **Financeiro** (consulta agregada simples).
- Garantir realtime (opcional) na tabela `visitas`.

---

### Ordem de execução e pontos de aprovação

1. Migration (Etapa 1) — requer aprovação do usuário.
2. Configurações + CRUD de Usuários (Etapa 2).
3. Cadastro de Visitas + refator da página (Etapa 3).
4. Refinos (Etapa 4).

### Perguntas antes de começar

- **Responsáveis = usuários com login no sistema?** A proposta acima trata responsáveis como **perfis internos** (tabela `usuarios` simples, sem auth). Se você quiser que cada responsável faça login (Lovable Cloud Auth com email/senha + Google), isso vira uma etapa extra (auth + tabela `profiles` + roles). Posso seguir do jeito simples ou já incluir login?
- **Custo do kit**: calcular dinamicamente a partir dos itens do kit, ou adicionar campo `custo_unitario` direto na tabela `kits`?
