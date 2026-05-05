## Objetivo

Hoje o botão "Novo" da página de Municípios não tem ação — é só um `<button>` decorativo, e a lista vem de mock estático (`MUNICIPIOS` em `src/data/mockData.ts`). Vou ativar o cadastro real, salvar no banco e adicionar um seletor inteligente de Estado (UF) e Município que consulta a API pública do IBGE (sem precisar de chave).

## O que será entregue

1. **Tabela `municipios` no banco** com persistência real (substitui o mock nesta página).
2. **Botão "Novo" funcional** abrindo um formulário (Sheet/bottom sheet, padrão já usado em Kits/Estoque).
3. **Seletor de Estado (UF)** — dropdown carregado da API do IBGE com os 27 estados.
4. **Seletor de Município com busca** — após escolher a UF, carrega todos os municípios reais daquele estado da API do IBGE; campo com busca por nome (Combobox), evitando erros de digitação.
5. **Auto-preenchimento** de `regiao` (microrregião IBGE) e `estado` quando o município é escolhido.
6. **Campos editáveis no cadastro**: prioridade (alta/média/baixa), responsável, status inicial (default "não iniciado"), e os 4 critérios de score (Abertura, Potencial, Relacionamento, Facilidade — 0 a 5 cada) com cálculo automático do score total.
7. **Lista e ficha de detalhe** passam a ler do banco; contadores de contatos/documentos/custo continuam vindo dos mocks por enquanto (próximo passo seria conectá-los também).

## Detalhes técnicos

**Migração SQL** — criar `public.municipios`:
- `id uuid pk default gen_random_uuid()`
- `nome text not null`, `estado text not null`, `regiao text`
- `ibge_codigo text` (código do município no IBGE, útil para deduplicar)
- `status text default 'não iniciado'`, `prioridade text default 'média'`
- `responsavel text`
- `score int default 0`, `abertura int default 0`, `potencial int default 0`, `relacionamento int default 0`, `facilidade int default 0`
- `ultima_visita date`, `has_cliente boolean default false`
- `created_at`, `updated_at` timestamps + trigger de updated_at
- RLS habilitado com policy permissiva (mesmo padrão das tabelas existentes do projeto)
- Índice único em `ibge_codigo` para evitar cadastrar o mesmo município duas vezes

**Frontend (`src/pages/Municipios.tsx`)**:
- Substituir `MUNICIPIOS` mock por `useQuery` no Supabase (`from('municipios').select('*')`).
- Adicionar `Sheet` com formulário de cadastro disparado pelo botão "Novo".
- Validação com `zod` (nome obrigatório, estado obrigatório, scores 0-5).
- Mutação de insert com toast de sucesso/erro e invalidação da query.

**Integração IBGE** (API pública, sem chave):
- Estados: `https://servicosdados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome`
- Municípios da UF: `https://servicosdados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`
- Resposta inclui microrregião, que será usada para preencher `regiao` automaticamente.
- Resultados cacheados via React Query (estados raramente mudam; municípios por UF).
- Componente `Combobox` (cmdk + Popover, já disponível em `command.tsx`/`popover.tsx`) para busca rápida entre os 5.500+ municípios.

**Fora do escopo deste passo** (posso fazer em seguida se quiser):
- Migrar contatos/visitas/documentos para usar `municipio_id` real da nova tabela.
- Edição/exclusão de municípios cadastrados.
- Importar os 12 municípios de exemplo do mock como seed inicial.
