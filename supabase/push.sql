-- Grimório · notificações com o app fechado (Web Push) · rode depois do schema.sql
-- Grimório · closed-app notifications (Web Push) · run after schema.sql

-- 1) Assinaturas de push de cada aparelho / per-device push subscriptions
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  tz         text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: ler as proprias"    on public.push_subscriptions;
drop policy if exists "push: criar as proprias"  on public.push_subscriptions;
drop policy if exists "push: alterar as proprias" on public.push_subscriptions;
drop policy if exists "push: apagar as proprias" on public.push_subscriptions;
create policy "push: ler as proprias"     on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push: criar as proprias"   on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push: alterar as proprias" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push: apagar as proprias"  on public.push_subscriptions for delete using (auth.uid() = user_id);
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- 2) Lembretes já enviados (evita repetir) / sent log (dedupe) — só o servidor usa
create table if not exists public.push_sent (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;

-- 3) Agendador: chama a função a cada minuto / scheduler: call the function every minute
-- ⚠️ Troque SEU-PROJETO pelo id do seu projeto e COLE_A_CHAVE_ANON pela chave "anon (public)"
--    (Project Settings → API Keys → aba "Legacy anon, service_role API keys" → anon → Copy).
--    Ela é pública (a mesma que vai no navegador). NUNCA use a service_role aqui.
-- ⚠️ Replace SEU-PROJETO with your project id and COLE_A_CHAVE_ANON with the public "anon" key.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('grimorio-lembretes') where exists (select 1 from cron.job where jobname = 'grimorio-lembretes');
select cron.schedule('grimorio-lembretes', '* * * * *', $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer COLE_A_CHAVE_ANON'),
    body := '{}'::jsonb
  );
  delete from public.push_sent where sent_at < now() - interval '3 days';
$$);
