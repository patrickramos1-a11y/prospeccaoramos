Vou corrigir isso de forma definitiva, porque o problema não é só “altura máxima”: o `Command/cmdk` está dentro de um `Popover` e de um `Sheet`, e o scroll com roda/touchpad/dedo está ficando preso ou direcionado para o contêiner errado. Por isso a rolagem automática ao clicar no botão do meio funciona, mas a rolagem comum não.

Plano de implementação:

1. Corrigir o seletor de Estado
   - Aplicar a mesma estrutura de scroll dedicada usada no município.
   - Definir altura máxima explícita para a lista.
   - Garantir `overflow-y-auto`, `overscroll-contain`, `min-h-0` e comportamento de toque/roda adequado.
   - Adicionar espaço interno à direita para a barra de rolagem não cobrir texto.

2. Corrigir o seletor de Município
   - Substituir a dependência de rolagem implícita do `CommandList` por um contêiner de lista realmente rolável.
   - Garantir que a rolagem com roda do mouse, touchpad e dedo funcione dentro do popover.
   - Limitar a altura do dropdown sem cortar os itens.
   - Manter busca, destaque, seleção e exibição da microrregião.

3. Evitar conflito entre o Sheet e os Popovers
   - Ajustar o conteúdo do popover para não deixar o evento de rolagem “escapar” para o painel lateral.
   - Manter o popover dentro da área visível e com altura adequada ao viewport.
   - Usar `side="bottom"`, largura do gatilho e regras de overflow consistentes nos dois campos.

4. Tornar a barra de rolagem visível e usável
   - Aumentar a largura visual da scrollbar nesses dropdowns, se necessário, porque a scrollbar global atual tem só 5px e fica quase imperceptível.
   - Aplicar isso apenas nesse seletor, sem alterar todos os scrolls do app.

5. Validar no preview
   - Abrir `/municipios`, abrir o cadastro, abrir Estado e Município.
   - Testar rolagem comum com roda/touchpad no dropdown.
   - Testar muitos resultados em um estado grande.
   - Confirmar que ainda é possível pesquisar e selecionar normalmente.

Arquivos esperados:
- `src/components/IbgeMunicipioPicker.tsx`
- Possivelmente `src/index.css` apenas se for necessário criar uma classe específica de scrollbar visível para esses dropdowns.

Resultado esperado:
- Estado deve permitir rolar até todos os 27 estados sem precisar pesquisar.
- Município deve permitir rolar por todos os municípios do estado selecionado sem precisar pesquisar.
- A rolagem comum deve funcionar, não apenas a rolagem automática do clique no scroll do mouse.