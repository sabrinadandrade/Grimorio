# 💜 Como contribuir / How to contribute

Obrigada por querer ajudar! O Grimório não tem build: basta clonar o projeto, abrir o `index.html` no navegador e editar os arquivos. Recarregue a página para ver as mudanças.

Thanks for helping! There is no build step: clone, open `index.html` in a browser, edit, reload.

## 🎓 Criar um conector para sua instituição / Add a school connector

1. Copie `js/connectors/generic.js` para `js/connectors/sua-faculdade.js`.
2. Troque `id`, `name`, `emoji` e escreva o passo a passo em `help.pt` e `help.en`.
3. Implemente `parse(text)`. Ela recebe o texto que a pessoa copiou do portal e devolve:

```js
{
  subjects:   [{ name: "Cálculo I", topics: ["Limites", "Derivadas | regras básicas"] }],
  exams:      [{ subject: "Cálculo I", date: "2026-11-06", time: "09:00", place: "Sala 12" }],
  cards:      [{ subject: "Cálculo I", q: "Pergunta?", a: "Resposta" }],
  topicsOnly: ["Tema sem matéria"]   // o app pergunta de qual matéria é
}
```

4. Adicione `<script src="js/connectors/sua-faculdade.js"></script>` no `index.html`, depois de `registry.js`, e o arquivo na lista `FILES` do `sw.js`.
5. Use as funções prontas: `G.cleanLines(text)`, `G.parseDateLoose("06/11, às 10:35")` e `G.parseTimeLoose("10h30")`.

**Regras importantes**
- 🔒 **Nunca peça senha** e nunca envie dados para servidores. Conectores só leem o texto colado.
- Teste com um texto de exemplo **sem dados pessoais**.

## 🐾 Criar uma espécie de pet / Add a pet species

Em `js/pets.js`, adicione uma entrada em `G.SPECIES`:

```js
axolotl: {
  d: { base: "#ffb8d1", accent: "#ff7aa8", pattern: "none", eye: "#2a1d33" }, // cores padrão
  patterns: ["none", "spots", "belly"],                                      // padrões permitidos
  draw(p, o, fc, mood) {   // p = pet, o = cor do contorno, fc = cor dos traços do rosto
    return {
      back:  "...",        // SVG atrás da cabeça (orelhas, guelras…)
      head:  `<ellipse cx="50" cy="60" rx="36" ry="30"/>`, // forma da cabeça (sem fill)
      front: "...",        // nariz, boca, bico…
      top: 30              // altura do topo da cabeça (para acessórios)
    };
  }
}
```

Depois coloque o nome em `G.SPECIES_ORDER` e em `speciesNames` no `js/i18n.js`. O desenho usa `viewBox="0 0 100 100"`, e os olhos ficam por padrão em (36,57) e (64,57).

Os pets precisam ser **desenhos originais**. Não use personagens de franquias (Pokémon, Sanrio, Disney etc.).

## 🎨 Criar um tema de cores / Add a color theme

Adicione uma entrada em `G.THEMES` (`js/themes.js`) com as 12 chaves, e o nome em `presetNames` (`js/i18n.js`).

## 🥚 Novo formato de bichinho virtual / New virtual pet shape

Em `js/tama.js`, adicione em `G.TAMA_SHAPES` um `path` SVG, o tamanho do `viewBox` (`vb`), a caixa da tela (`scr: [x, y, largura, altura]`) e a altura dos botões (`btn`). Coloque o nome em `shapeNames`.

## 🌍 Traduções / Translations

Copie o bloco `en` em `js/i18n.js` para um idioma novo (ex.: `es`) e traduza. Ele aparece automaticamente no seletor de idioma.

## ✅ Antes do pull request / Before opening a PR

- Abra o `index.html` e confira se não há erros no console (F12).
- Teste no celular (modo responsivo do navegador).
- Mantenha o estilo: fofo, colorido e acessível. 💛
