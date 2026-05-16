## Anexos de documentos nos itens de estoque

Adicionar a possibilidade de anexar arquivos (artes, PDFs, imagens, etc.) a cada item do estoque, com download e gerenciamento direto pela aba de Estoque.

### Caso de uso
Itens como cartões de visita, folders e brindes personalizados precisam ter sua **arte/arquivo de impressão** vinculada. Assim, ao precisar reimprimir, basta abrir o item, baixar o arquivo original e enviar para a gráfica — sem depender de procurar em pastas externas.

### Etapa 1 — Banco de dados
- Criar bucket público `estoque-documentos` no storage (com políticas de leitura pública e escrita liberada).
- Nova tabela `estoque_itens_documentos`:
  - `item_id` (FK para `estoque_itens`)
  - `nome` (nome amigável do arquivo)
  - `arquivo_url` (URL pública no storage)
  - `arquivo_path` (caminho no bucket, para permitir exclusão)
  - `tipo_mime`, `tamanho_bytes`
  - `descricao` (opcional, ex: "Arte frente v2", "Versão 2024")
  - `created_at`
- RLS liberada (seguindo padrão atual do projeto).

### Etapa 2 — Formulário do item de estoque
No sheet de cadastro/edição de item, adicionar uma seção **"Documentos / Artes"**:
- Lista dos documentos já anexados, com:
  - Ícone por tipo (PDF, imagem, etc.)
  - Nome + tamanho
  - Botões: **Baixar**, **Visualizar** (abre em nova aba), **Excluir**
- Botão **"+ Anexar documento"** que abre seletor de arquivo (aceita PDF, PNG, JPG, AI, PSD, ZIP).
- Campo opcional de descrição ao anexar.
- Upload feito direto para o bucket via Supabase Storage SDK.

### Etapa 3 — Visualização na lista de estoque
- Mostrar um pequeno indicador (ícone de clipe 📎 + contador) nos cards de itens que possuem documentos anexados, para identificar rapidamente quais itens já têm arte cadastrada.

### Detalhes técnicos
- Componente novo: `src/components/EstoqueDocumentosManager.tsx` (lista + upload + exclusão).
- Integrar no `EstoqueItemFormSheet` existente (ou equivalente — verificar arquivo atual).
- Limite sugerido: 20MB por arquivo.
- Ao excluir documento: remover do storage **e** do banco.
- Nome do arquivo no storage: `{item_id}/{timestamp}-{nome-original}` para evitar colisões.

### Fora de escopo (pode ser feito depois)
- Versionamento de artes (manter histórico de versões antigas).
- Preview inline de PDF/AI dentro do sheet.
- Compartilhamento de link público com expiração.

Posso seguir com essa implementação?