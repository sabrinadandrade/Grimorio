-- Grimório · esquema do banco (Supabase / Postgres)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Paste this into the Supabase SQL Editor and click "Run".

-- Uma linha por pessoa, com o grimório inteiro em JSON.
-- One row per person, holding the whole grimoire as JSON.
create table if not exists public.grimoires (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint grimoire_size check (pg_column_size(data) < 2000000) -- ~2 MB por pessoa / per person
);

-- Segurança: cada pessoa só vê e altera a PRÓPRIA linha (Row Level Security).
-- Security: each person can only read and write their OWN row.
alter table public.grimoires enable row level security;

drop policy if exists "grimoire: ler o proprio"      on public.grimoires;
drop policy if exists "grimoire: criar o proprio"    on public.grimoires;
drop policy if exists "grimoire: alterar o proprio"  on public.grimoires;
drop policy if exists "grimoire: apagar o proprio"   on public.grimoires;

create policy "grimoire: ler o proprio"     on public.grimoires for select using (auth.uid() = user_id);
create policy "grimoire: criar o proprio"   on public.grimoires for insert with check (auth.uid() = user_id);
create policy "grimoire: alterar o proprio" on public.grimoires for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "grimoire: apagar o proprio"  on public.grimoires for delete using (auth.uid() = user_id);

-- Permissões da API: só quem está logado (authenticated) acessa a tabela; o RLS acima limita à própria linha.
-- API grants: only signed-in users reach the table; RLS above limits them to their own row.
revoke all on public.grimoires from anon;
grant select, insert, update, delete on public.grimoires to authenticated;
