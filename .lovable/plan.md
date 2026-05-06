
## Objetivo

1. Reordenar a navegação para: Dashboard, **Municípios → Contatos → Órgãos → Visitas**, Estoque, Kits, Inteligência, Financeiro.
2. Criar nova aba **Órgãos** entre Contatos e Visitas para cadastrar órgãos municipais (SEMMA, SEMAS, SEFA, etc.).
3. No cadastro de órgão, vincular: **Estado**, **Município**, e **Contatos** já cadastrados (relação N:N).
4. Como Órgãos depende de Contatos reais, vamos migrar a tela de Contatos do mock (`CONTATOS` em `mockData.ts`) para o banco também — caso contrário não há como relacionar.

---

## Mudanças no Backend (Lovable Cloud)

Criar via migração SQL:

### Tabela `contatos`
```text
id              uuid PK (gen_random_uuid)
nome            text not null
cargo           text
nivel           text default 'Básico'   -- Decisor | Relevante | Básico
municipio_id    uuid -> municipios(id) on delete set null
telefone        text
email           text
whatsapp        boolean default false
observacoes     text
created_at, updated_at  timestamptz
```
RLS: `Allow all access` (mesmo padrão das outras tabelas do projeto).

### Tabela `orgaos`
```text
id              uuid PK
nome            text not null            -- ex: "SEMMA"
sigla           text
tipo            text                     -- ex: "Secretaria Municipal de Meio Ambiente"
estado          text not null            -- UF
municipio_id    uuid -> municipios(id) on delete cascade
endereco        text
telefone        text
email           text
observacoes     text
created_at, updated_at  timestamptz
```

### Tabela de junção `orgao_contatos`
```text
id              uuid PK
orgao_id        uuid -> orgaos(id) on delete cascade
contato_id      uuid -> contatos(id) on delete cascade
papel           text                     -- ex: "Secretário", "Assessor"
unique(orgao_id, contato_id)
```

Triggers `updated_at` reutilizando `public.update_updated_at_column()`.

---

## Mudanças no Frontend

### 1. Sidebar (`src/components/AppLayout.tsx`)
Reordenar `navItems` para: Dashboard, **Municípios, Contatos, Órgãos, Visitas**, Estoque, Kits, Inteligência, Financeiro. Adicionar ícone `Landmark` (lucide) para Órgãos e badge dinâmico com a contagem (`select count` em `orgaos`).

### 2. Roteamento (`src/App.tsx`)
Adicionar rota `/orgaos` apontando para nova página `Orgaos`.

### 3. Página de Contatos (`src/pages/Contatos.tsx`) — migração para banco
- Remover dependência de `CONTATOS` (mock).
- Listar via `useQuery` em `contatos` com join lógico para `municipios` (nome/UF).
- Botão **Novo Contato** abre `Sheet` com formulário (nome, cargo, nível, município via `IbgeMunicipioPicker` ou select dos municípios já cadastrados, telefone, email, whatsapp, observações).
- Suporte a editar e excluir (mesmo padrão de `Municipios.tsx`: `useMutation` + invalidate).
- Manter visual atual (cards, stats de Decisores/Relevantes/WhatsApp, busca).

### 4. Nova página `src/pages/Orgaos.tsx`
- Header com título "Órgãos Municipais" + botão **Novo Órgão**.
- Stats simples: total de órgãos, órgãos por município, contatos vinculados.
- Busca por nome/sigla/município.
- Grid de cards com nome, sigla, município/UF, lista resumida dos contatos vinculados.
- `Sheet` lateral para criar/editar com:
  - Nome, Sigla, Tipo (text)
  - **Estado + Município** via `IbgeMunicipioPicker` (mesmo componente já usado em Municípios), preenchendo `estado` e `municipio_id` (resolvendo para o município já cadastrado no banco; se não existir, criar entrada em `municipios` automaticamente — mesma lógica que já existe no fluxo).
  - Endereço, Telefone, Email, Observações.
  - **Contatos vinculados**: multi-select dos contatos existentes filtrados pelo município escolhido, com campo opcional "papel" por contato. Salvar inserindo linhas em `orgao_contatos`.
- Editar/excluir com confirmação.

### 5. Detalhes técnicos
- Reaproveitar padrões de `Municipios.tsx`: `react-hook-form` + `zod`, `Sheet`, `useMutation`, `queryClient.invalidateQueries`.
- Tipagens vêm de `@/integrations/supabase/types` (auto-geradas após a migração).
- Toasts em criar/editar/excluir.
- Mobile-first (cards em coluna no mobile, grid em telas maiores).

---

## Arquivos esperados
- migração SQL: criar `contatos`, `orgaos`, `orgao_contatos` + triggers + RLS.
- `src/components/AppLayout.tsx` — reordenar nav e adicionar Órgãos.
- `src/App.tsx` — registrar rota `/orgaos`.
- `src/pages/Contatos.tsx` — migrar do mock para Supabase com CRUD.
- `src/pages/Orgaos.tsx` — **novo arquivo** com listagem e CRUD.
- (opcional) `src/data/mockData.ts` — manter constantes de cor/labels, mas remover dependência da lista `CONTATOS` quando Contatos passar a usar o banco.

## Resultado esperado
- Sidebar na ordem solicitada.
- Aba **Órgãos** funcional, permitindo cadastrar SEMMA/SEMAS/SEFA etc., escolhendo estado, município e marcando os contatos institucionais já cadastrados que pertencem àquele órgão.
- Contatos passam a ser persistidos de verdade (necessário para o vínculo).
