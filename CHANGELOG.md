# ☾ Notas de atualização do Grimório ☽

Tudo o que mudou em cada versão, do mais novo para o mais antigo.

---

## ✨ v2.2 — 29/10/2026 · "Tudo no lugar"

### 🗂️ Abas organizadas em 6 grupos
- **Hoje**, **Semana**, **Atividades**, **Estudos** (Matérias & provas, Tarot, O que cai, Calendário lunar), **Meu grimório** (Meus pets, Aparência, Conquistas) e **Dados e ajuda** (Importar / conectar, Dicas de foco).
- Os grupos com várias páginas mostram **sub-abas** logo acima do conteúdo. No celular, elas também aparecem no menu lateral, embaixo do grupo.
- O Grimório lembra a última sub-aba que você abriu em cada grupo.

### 📋 Uma lista só na aba Hoje
- Atividades e feitiços de estudo agora ficam numa **lista única do dia**, ordenada por prioridade e horário, com os itens feitos no fim.

### ↩ Desfazer
- Concluiu ou apagou algo sem querer? Aparece um aviso com **↩ Desfazer** por 6 segundos, e tudo volta como estava, até o XP.
- Vale para atividades, feitiços, provas, cartas do tarot, matérias, pets e pedidos feitos por voz.
- Apagar uma atividade não pede mais confirmação, porque agora dá para desfazer.

### 📊 Resumo da semana
- Nova janela **resumo_da_semana.exe** na aba Semana, com os últimos 7 dias: coisas feitas (comparadas aos 7 dias anteriores), velas de foco, sequência e recorde.
- Gráficos de **concluídas por dia** (toque na barra para ver o número) e **por área**, com versão em tabela.
- **Quando você rende mais:** manhã, tarde, noite ou madrugada, a partir do horário em que você concluiu as tarefas nos últimos 30 dias.
- A partir desta versão, o Grimório guarda o horário de cada conclusão e as velas de foco de cada dia, sempre no aparelho.

### 🛠️ Correções
- Em telas bem estreitas (320 px), os campos das matérias ficavam espremidos ao lado do título. Corrigido.
- Os cartões de pets se ajustam a telas pequenas.

---

## v2.1 — 29/10/2026 · "Fala comigo!"

### 🎙️ Falar com o Grimório
- Novo botão **🎙️** fixo no canto da tela, e também nas abas **Hoje** e **Atividades**.
- Fale (pelo 🎤 do teclado do celular) ou escreva o pedido, do jeito que você falaria com alguém:
  - *"Me lembra de dar remédio pro gato amanhã às 8"* cria uma atividade com lembrete;
  - *"Academia toda segunda e quarta às 7 da manhã"* cria uma atividade que se repete;
  - *"Prova de cálculo dia 12/11 às 9h na sala 12"* marca a prova;
  - *"Concluir lavar a louça"* marca como feita;
  - *"O que eu tenho hoje?"* mostra a lista do dia;
  - *"Começar foco em derivadas"* acende a vela de foco.
- Entende datas (hoje, amanhã, sexta, dia 12/11, 20 de novembro, daqui a 3 dias), horários (às 8, 9h30, 3 da tarde, meio-dia), repetições (todo dia, toda segunda e quarta, dias de semana), lembretes (*"30 minutos antes"*, *"um dia antes"*) e prioridade (*"importante"*, *"urgente"*). A área (casa, pets, saúde, trabalho…) é escolhida sozinha.
- Mostra o que entendeu e **só salva depois que você confirma**. Para mudar algum detalhe, toque em **✎ Ajustar**.
- Funciona sem internet e sem IA externa: o pedido é entendido no próprio aparelho.

### 📅 Avisos pelo calendário do celular
- Em **Atividades → lembretes.exe → 📅 Adicionar ao calendário do celular**.
- Gera um arquivo com suas atividades que têm horário (com as repetições) e suas provas, **já com os alarmes**.
- Depois de adicionado, o calendário do iPhone ou do Android avisa **mesmo com o Grimório fechado**. As provas avisam 1 dia antes e 1 hora antes.

### 📱 Celular mais confortável
- **A tarefa do dia aparece logo de cara.** O cabeçalho ficou compacto no celular (título menor, pets numa fileira e XP resumido), e as contagens das provas viraram cartões que deslizam para o lado.
- **A tela não escorrega mais para o lado** ao rolar.
- No celular, o **bichinho começa minimizado** para não cobrir as tarefas. Toque na bolinha para abrir.
- Campos de texto e itens da semana com no mínimo 44 px de altura, mais fáceis de tocar.
- Títulos longos de janela terminam com "…" em telas pequenas.
- Os avisos não se empilham mais: aparece um de cada vez.

---

## v2.0 — 29/10/2026 · "Do seu jeito"

### ➖ Minimizar tudo
- Todo card pode ser minimizado: as janelas (botão **−** na barra), o painel de nível/XP e a contagem das provas. O Grimório lembra como você deixou.
- O **bichinho virtual** tem o botão **▾**: vira uma bolinha com o seu pet, mostrando o tempo se o timer estiver rodando.

### 📲 Menu lateral no celular
- O menu agora é lateral, como nos apps: botão **☰** no topo, ou **arraste o dedo da borda esquerda** para abrir e para a esquerda para fechar.
- No computador, as abas continuam fixas no topo.

### 💾 Salvar e Cancelar sempre visíveis
- Nas janelas de cadastro, os botões ficam presos embaixo. Não precisa mais rolar a tela para salvar.

### 🔒 100% local
- O Grimório **não tem mais servidor, banco de dados nem login**. Tudo fica só no seu aparelho.
- Novo **backup criptografado** (`.grimorio`), trancado com senha (AES-256), para guardar uma cópia ou **passar para outro aparelho** (janela **passar_aparelho.exe**).
- A conquista "Na nuvem" virou **"Guardiã(o) dos dados"**: faça seu primeiro backup.

### 📖 Tutorial
- Um tutorial só, completo e com prints, com uma caixa **"O que você precisa saber"** no começo.

---

## v1.x — outubro de 2026 · Primeiras versões

- **Planner de estudos:** matérias, provas e plano automático até cada prova, com feitiços do dia, XP, níveis e luas.
- **Conectores:** importação da Estácio e de qualquer instituição (colar texto, `.csv`, `.ics`, `.json`).
- **Atividades da vida toda:** estudos, rotina, casa, pets, filhos, trabalho, compromissos e saúde, com prioridade, repetição, subtarefas e lembretes com o seu pet.
- **Semana, sequência de dias 🔥 e conquistas 🏆.**
- **Bichinho virtual (timer de foco)** em 5 formatos, com tamanho ajustável.
- **Tarot de estudos (flashcards)**, "O que cai" e calendário lunar.
- **Pets personalizáveis** (14 espécies), 7 temas de cores, pronome (ela / ele / elu), português e inglês.
- **App Android (APK)** com notificações mesmo com o app fechado, e instalação no iPhone pela Tela de Início.
