-- Base de données de BMB Playbook.
-- À coller en une fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans perdre les données.

-- Liste des coachs autorisés (e-mail en minuscules)
create table if not exists public.coaches (
  email text primary key check (email = lower(email)),
  name text,
  added_at timestamptz not null default now()
);

create table if not exists public.plays (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.matches (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.drills (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.sessions (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Effectif des équipes
create table if not exists public.members (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Vrai si la personne connectée figure dans la liste des coachs
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coaches c where c.email = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- Sécurité : rien pour les visiteurs, tout le contenu pour les coachs listés
alter table public.coaches enable row level security;
revoke all on public.coaches from anon, authenticated;
grant select on public.coaches to authenticated;

drop policy if exists "un coach lit sa fiche" on public.coaches;
create policy "un coach lit sa fiche" on public.coaches
  for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- Mêmes règles pour toutes les tables de contenu
do $$
declare
  t text;
begin
  foreach t in array array['plays', 'matches', 'drills', 'sessions', 'members'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "coachs" on public.%I', t);
    execute format('create policy "coachs" on public.%I for all to authenticated using (public.is_coach()) with check (public.is_coach())', t);
  end loop;
end;
$$;
