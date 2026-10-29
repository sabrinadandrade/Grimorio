# ☾ Grimório ☽ — planner kawaii de estudos e vida pessoal

> 🇧🇷 Português · [🇺🇸 English below](#-english)

Um planner **fofo, mágico e anos 90** para **estudos e assuntos pessoais** (faculdade, escola, concurso, curso livre, metas, casa, saúde…), feito para quem tem dificuldade de foco.
Seus pets viram professores, cada tarefa é um feitiço e o timer é um bichinho virtual. 🐾🔮

![Grimório](docs/screenshot.png)

## 🚀 Como usar

- **Site:** <https://sabrinadandrade.github.io/Grimorio/> · **App Android:** [Grimorio.apk](https://github.com/sabrinadandrade/Grimorio/releases/latest)
- 📖 **Todo o passo a passo (computador, iPhone e Android) está no [Tutorial](docs/TUTORIAL.md)**, com prints de cada tela.

## ✨ O que ele faz

- **Plano de estudos automático**: você cadastra matérias, temas e provas. O Grimório espalha os temas nos dias antes de cada prova e deixa a véspera para uma revisão leve.
- **Feitiços de hoje**: poucas tarefas por dia, com XP, níveis (de Aprendiz a Arquimaga 👑) e luas que vão enchendo 🌑→🌕.
- **Atividades da vida toda** 🆕: estudos, rotina diária, casa, pets, cuidados maternais/paternais, trabalho, compromissos e saúde, com **prioridade** (🔥 alta, ⭐ média, 🌙 baixa), **repetição** (todo dia ou dias da semana) e **lembrete**.
- **Subtarefas, visão da semana, sequência de dias 🔥 e conquistas 🏆** 🆕
- **Lembretes com seu pet** 🆕: na hora, seu pet aparece na tela te lembrando. No app Android, chega notificação mesmo com o app fechado.
- **Feito para todo mundo:** nome ou apelido com **pronome** (ela/dela, ele/dele, elu/delu), **menu lateral** no celular, bichinho com **tamanho ajustável (−/+)**, botões grandes, **tamanho do texto** e modo **menos animações**.
- **Bichinho virtual (timer de foco)**: estilo tamagotchi, em 5 formatos (ovo, coração, chapéu de bruxa, estrela e lua). Seu pet dorme na pausa 😴.
- **Tarot de estudos (flashcards)**: as cartas que você erra voltam mais vezes.
- **Pets personalizáveis**: gato, cachorro, ratinho, hamster, coelho, galinha, pato, passarinho, cobra, tartaruga, sapo, peixe, morcego e raposa. Você escolhe cores, padrão ou raça (tigrado, siamês, frajola, pintado…), cor dos olhos e acessório (chapéu de bruxa, laço, coroa…).
- **Temas de cores**: Halloween, Kawaii amarelo, Pastel goth, Floresta, Oceano, Morango, Noite estrelada. Você também pode montar suas próprias cores.
- **Conectar com a sua instituição**: copie e cole o texto do portal (sem senha!). Também importa `.csv`, calendário `.ics` (Google Agenda, Outlook, Moodle) e backup `.json`.
- **Português e inglês**, funciona **offline** e pode ser **instalado** como app (PWA).

## 🔒 Privacidade

**100% local:** sem servidor, sem banco de dados e sem login. Tudo fica só no aparelho de cada pessoa (localStorage + cópia em IndexedDB, com recuperação automática). Backups podem ser exportados como `.json` ou como arquivo `.grimorio` trancado com senha (PBKDF2-SHA256 600 mil rodadas + AES-GCM 256, direto no navegador).

## 🎓 Instituições suportadas

| Instituição | Como importar |
|---|---|
| ✨ Qualquer uma / uso pessoal | Cole linhas como `Cálculo I - 06/11 09:00 - Sala 12`, ou importe `.csv`/`.ics` |
| 🎓 Estácio (Sala de Aula Virtual) | Copie a página **Início** (provas) e as páginas **Conteúdos** (temas) |

Sua faculdade não está na lista? **Crie um conector!** É um arquivo JavaScript pequeno. Veja o [CONTRIBUTING.md](CONTRIBUTING.md).

## 🧱 Tecnologia

HTML + CSS + JavaScript puro. Sem framework e sem etapa de build. Para contribuir, basta um editor de texto e um navegador.

```
index.html
css/style.css
js/
  i18n.js          traduções (pt, en)
  themes.js        temas de cores
  pets.js          gerador de pets em SVG
  store.js         dados (localStorage)
  safety.js        IndexedDB, backup automático, cópias de segurança
  vault.js         backup criptografado com senha
  planner.js       gerador do plano de estudos
  importers.js     json, csv, ics
  connectors/      um arquivo por instituição
  tama.js          bichinho virtual / timer
  fx.js            efeitos (estrelinhas, balões)
  app.js           interface
```

## 💜 Contribuindo

Ideias, pets novos, temas, traduções e conectores são muito bem-vindos! Leia o [CONTRIBUTING.md](CONTRIBUTING.md).

Licença [MIT](LICENSE).

---

## 🇺🇸 English

A **cute, magical, 90s-style** study planner for people who struggle to focus.
Your pets become teachers, every task is a spell, and the focus timer is a virtual pet. 🐾🔮

- **Automatic study plan**: spreads topics over the days before each exam and keeps the day before for light review.
- **Today's spells**: a few tasks per day, plus XP, levels and moon phases 🌑→🌕.
- **Virtual pet focus timer**: tamagotchi style, in egg, heart, witch hat, star and moon shapes.
- **Study tarot (flashcards)**: cards you miss come back more often.
- **Custom pets**: 14 species, with your choice of colors, patterns or breeds, eye color and accessories.
- **Color themes**: 7 presets, plus fully custom colors.
- **Connect your school**: paste text copied from the portal (no passwords), or import `.csv`, `.ics` or `.json`.
- **Portuguese and English**, works **offline** and can be installed as a PWA.
- **100% local, no server**: data never leaves the device. It is mirrored to IndexedDB, can be auto-backed-up to a local file, and exported as a passphrase-encrypted `.grimorio` file (PBKDF2 + AES-GCM) to move between devices.

Use it at <https://sabrinadandrade.github.io/Grimorio/> (Android app: [Grimorio.apk](https://github.com/sabrinadandrade/Grimorio/releases/latest)). The step-by-step guide (in Portuguese, with screenshots) is in [docs/TUTORIAL.md](docs/TUTORIAL.md).
To contribute (connectors, pets, themes, translations), see [CONTRIBUTING.md](CONTRIBUTING.md). License: MIT.
