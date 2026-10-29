# ☁️ Ativando a nuvem (Supabase) — passo a passo

Com a nuvem ativada, cada pessoa entra com o próprio e-mail (por um link mágico, sem senha) e o grimório dela fica salvo num banco de dados de verdade, o **Postgres do Supabase**. Assim ela não perde nada se trocar de computador ou limpar o navegador, e consegue usar no celular e no PC.

Sem a nuvem, o Grimório continua funcionando normalmente, guardando os dados no navegador, com cópia em IndexedDB e backup em arquivo.

> Leva uns 10 minutos. O plano grátis do Supabase aguenta milhares de pessoas usando o Grimório.

## 1. Criar o projeto

1. Crie uma conta em <https://supabase.com> (dá pra entrar com o GitHub).
2. Clique em **New project**, dê um nome (ex.: `grimorio`), crie uma senha forte para o banco e escolha a região **South America (São Paulo)**.
3. Espere o projeto ficar pronto (uns 2 minutos).

## 2. Criar a tabela e as regras de segurança

1. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql), cole e clique em **Run**.
3. Pronto: isso cria a tabela `grimoires` e liga o **RLS** (Row Level Security). Com o RLS, cada pessoa só lê e altera a própria linha.

## 3. Configurar o login por e-mail

1. Abra **Authentication → Sign In / Providers** e confira se **Email** está ativado.
2. Abra **Authentication → URL Configuration**:
   - **Site URL**: o endereço do seu Grimório, ex.: `https://sabrinadandrade.github.io/grimorio/`
   - **Redirect URLs**: adicione o mesmo endereço (e `http://localhost:8000/*`, se for testar no seu computador).
3. (Opcional) Em **Authentication → Emails**, traduza o e-mail do link mágico para português. 💌

> O servidor de e-mail grátis do Supabase envia poucos e-mails por hora. Se muita gente for usar, configure um SMTP próprio (ex.: Resend ou Brevo) em **Authentication → Emails → SMTP Settings**.

## 4. Ligar o Grimório ao projeto

1. Abra **Project Settings → API** (ou **Data API**) e copie:
   - **Project URL** (ex.: `https://abcdxyz.supabase.co`)
   - a chave **anon public**
2. Cole as duas em [`js/config.js`](../js/config.js):

```js
G.CONFIG = {
  supabaseUrl: "https://abcdxyz.supabase.co",
  supabaseAnonKey: "eyJhbGciOi..."
};
```

3. Faça o commit e o push. Pronto! Em **Importar / conectar → Nuvem**, as pessoas digitam o e-mail e recebem o link.

### "Mas a chave fica pública no código?"

Fica, e tudo bem: a chave **anon** foi feita para ficar no navegador. Quem protege os dados são as **regras RLS** do passo 2. **Nunca** coloque a chave `service_role` no site.

## Como a sincronização funciona

- O app é **local-first**: funciona offline e salva primeiro no aparelho.
- Depois de entrar, cada mudança sobe para a nuvem uns 2 segundos depois.
- Ao abrir em outro aparelho, vale a versão **mais recente**. Antes de substituir, o app guarda uma cópia de segurança local, que pode ser restaurada em **Proteção dos dados → Cópias de segurança automáticas**.
- Se a internet cair, as mudanças ficam guardadas e sobem quando ela voltar.

## Para quem quer hospedar o próprio servidor

Qualquer pessoa pode usar o próprio Supabase sem mexer no código: em **Importar / conectar → Nuvem → Avançado**, é só colar a Project URL e a anon key do próprio projeto. O Supabase também pode ser auto-hospedado (é open source).
