# ☁️ Ativando a nuvem (Supabase) — passo a passo

Com a nuvem ativada, cada pessoa entra com o próprio e-mail (recebe um código de 6 dígitos, sem senha) e o grimório dela fica salvo num banco de dados de verdade, o **Postgres do Supabase**. Assim ela não perde nada se trocar de computador ou limpar o navegador, e consegue usar no celular e no PC.

Sem a nuvem, o Grimório continua funcionando normalmente, guardando os dados no navegador, com cópia em IndexedDB e backup em arquivo.

> Leva uns 10 minutos. O plano grátis do Supabase aguenta milhares de pessoas usando o Grimório.

## 1. Criar o projeto

1. Crie uma conta em <https://supabase.com> (dá pra entrar com o GitHub).
2. Clique em **New project** e dê um nome (ex.: `grimorio`).
3. Em **Database password**, clique em **Generate a password** e **guarde essa senha** num lugar seguro. O Grimório não usa essa senha, mas ela é a chave mestra do banco.
4. Em **Region**, a lista mostra primeiro só regiões gerais (Americas, Europe…). Clique em **Need a specific region?** e escolha **South America (São Paulo) · sa-east-1**.
5. Em **Security**, deixe **Enable Data API** ligado e **desmarque** **Automatically expose new tables**, como o próprio Supabase recomenda. O script do passo 2 libera só a tabela do Grimório.
6. Clique em **Create new project** e espere ficar pronto (uns 2 minutos).

## 2. Criar a tabela e as regras de segurança

1. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql), cole e clique em **Run**.
3. Vai aparecer o aviso **"Potential issue detected"**, porque o script tem comandos `drop policy if exists` e `revoke`. Num projeto novo isso é seguro: clique em **Run query**.
4. Deve aparecer **"Success. No rows returned"**. Pronto: a tabela `grimoires` foi criada com o **RLS** (Row Level Security) ligado. Cada pessoa só lê e altera a própria linha, e quem não fez login não acessa nada.

## 3. Configurar o login por e-mail

1. Abra **Authentication → Sign In / Providers** e confira se **Email** está ativado.
2. Abra **Authentication → URL Configuration**:
   - **Site URL**: o endereço do seu Grimório, ex.: `https://sabrinadandrade.github.io/Grimorio/`
   - **Redirect URLs**: clique em **Add URL** e adicione o endereço com `**` no final, ex.: `https://sabrinadandrade.github.io/Grimorio/**`. Se for testar no seu computador, adicione também `http://localhost:8000/**`.
   - ⚠️ O endereço do GitHub Pages diferencia maiúsculas: use o nome do repositório exatamente como ele está (`Grimorio` ≠ `grimorio`).
3. **Para mostrar o código no e-mail** (necessário pro app instalado no iPhone): hoje o Supabase só deixa editar os modelos depois de ligar um **SMTP próprio** (veja abaixo). Com o SMTP ligado, vá em **Authentication → Emails → Templates**, abra os modelos **Magic Link** e **Confirm signup** e coloque o código `{{ .Token }}` no texto. O Grimório pede esse código de 6 dígitos, que funciona até no app instalado no iPhone. Modelo pronto em português:

```html
<h2>☾ Grimório ☽</h2>
<p>Seu código para entrar:</p>
<h1 style="letter-spacing:8px">{{ .Token }}</h1>
<p>Digite esse código no Grimório. Ele vale por 1 hora.</p>
<p>Se você não pediu, é só ignorar este e-mail. 🐾</p>
```

   Assunto sugerido: `☾ Seu código do Grimório: {{ .Token }}`

> O servidor de e-mail grátis do Supabase envia poucos e-mails por hora. Se muita gente for usar, configure um SMTP próprio (ex.: Resend ou Brevo) em **Authentication → Emails → SMTP Settings**.

## 4. Ligar o Grimório ao projeto

1. Copie a **Project URL** (ex.: `https://abcdxyz.supabase.co`), que aparece na página inicial do projeto.
2. Abra **Project Settings → API Keys** e copie a **Publishable key** (começa com `sb_publishable_`). Projetos antigos mostram a chave **anon public** na aba *Legacy*, e ela também funciona.
3. Cole as duas em [`js/config.js`](../js/config.js):

```js
G.CONFIG = {
  supabaseUrl: "https://abcdxyz.supabase.co",
  supabaseAnonKey: "sb_publishable_..."
};
```

4. Faça o commit e o push. Pronto! Em **Importar / conectar → Nuvem**, as pessoas digitam o e-mail, recebem um código e entram.

### "Mas a chave fica pública no código?"

Fica, e tudo bem: a chave **publishable** (ou **anon**) foi feita para ficar no navegador. Quem protege os dados são as **regras RLS** do passo 2. **Nunca** coloque a chave **secret** (`sb_secret_…`) ou a `service_role` no site.

## 5. Avisos com o app fechado (opcional)

Isso faz o iPhone, o computador e o Android pelo navegador receberem lembretes **mesmo com o Grimório fechado** (padrão *Web Push*).

1. **Gere suas chaves de notificação** (um par público/privado). No computador, com o Node instalado:
   ```
   npx web-push generate-vapid-keys
   ```
2. Cole a **Public Key** em `js/config.js` → `vapidPublicKey`, e também no topo de `supabase/functions/send-reminders/index.ts` (`VAPID_PUBLIC_KEY`).
3. **Crie a função:** no Supabase, **Edge Functions → Deploy a new function → Via Editor**. Apague o exemplo, cole todo o conteúdo de [`supabase/functions/send-reminders/index.ts`](../supabase/functions/send-reminders/index.ts), dê o nome **`send-reminders`** e clique em **Deploy function**. Deixe o *Verify JWT* **ligado**.
4. **Guarde a chave privada:** **Edge Functions → Secrets → Add new secret**. Name: `VAPID_PRIVATE_KEY`, Value: a **Private Key** do passo 1. Salve. ⚠️ Essa chave **nunca** vai para o GitHub.
5. **Ligue o relógio:** abra o [`supabase/push.sql`](../supabase/push.sql), troque `SEU-PROJETO` pelo id do seu projeto e `COLE_A_CHAVE_ANON` pela chave **anon (public)** (Project Settings → API Keys → aba *Legacy anon, service_role API keys*). Cole no **SQL Editor** e clique em **Run**. Se aparecer *Potential issue detected*, clique em **Run query**.
6. Teste: no Grimório, aba **Atividades → lembretes.exe → 📲 Ativar avisos com o app fechado**. Crie uma atividade para daqui a 3 minutos com lembrete "na hora" e feche o app.

> A função roda a cada minuto, olha só quem ativou os avisos e manda cada lembrete **uma única vez**.

## Como a sincronização funciona

- O app é **local-first**: funciona offline e salva primeiro no aparelho.
- Depois de entrar, cada mudança sobe para a nuvem uns 2 segundos depois.
- Ao abrir em outro aparelho, vale a versão **mais recente**. Antes de substituir, o app guarda uma cópia de segurança local, que pode ser restaurada em **Proteção dos dados → Cópias de segurança automáticas**.
- Se a internet cair, as mudanças ficam guardadas e sobem quando ela voltar.

## Para quem quer hospedar o próprio servidor

Qualquer pessoa pode usar o próprio Supabase sem mexer no código: em **Importar / conectar → Nuvem → Avançado**, é só colar a Project URL e a anon key do próprio projeto. O Supabase também pode ser auto-hospedado (é open source).
