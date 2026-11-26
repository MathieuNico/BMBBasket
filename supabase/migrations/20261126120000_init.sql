-- Base de données de BMB Playbook.
-- Appliqué automatiquement par l'intégration GitHub de Supabase, ou à coller dans SQL Editor > New query > Run.
-- Le script peut être relancé sans perdre les données.
-- Une fois appliqué, toute évolution se fait dans un NOUVEAU fichier de ce dossier.

-- Coachs : seuls les comptes listés ici peuvent créer et modifier.
-- On désigne le compte lui-même (et non une adresse e-mail, qu'un autre pourrait utiliser).
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  added_at timestamptz not null default now()
);

-- Code club demandé aux joueurs (une seule ligne)
create table if not exists public.club (
  id boolean primary key default true check (id),
  code text not null check (code ~ '^[A-Z0-9]{10}$')
);

insert into public.club (code)
select string_agg(
  substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + ('x' || substr(md5(gen_random_uuid()::text), 1, 2))::bit(8)::int % 32, 1),
  ''
)
from generate_series(1, 10)
on conflict (id) do nothing;

-- Joueurs ayant donné le bon code club
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null check (length(trim(name)) between 1 and 60),
  team text not null check (length(trim(team)) between 1 and 30),
  joined_at timestamptz not null default now()
);

-- Contenus préparés par les coachs
create table if not exists public.plays (
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

-- Effectif des équipes (pour les présences)
create table if not exists public.members (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Équipes du club
create table if not exists public.teams (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Vrai si la personne connectée est coach
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
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

-- Rôle du compte connecté : coach, joueur, ou aucun accès
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_coach() then jsonb_build_object('role', 'coach')
    else coalesce(
      (select jsonb_build_object('role', 'player', 'name', p.name, 'team', p.team)
       from public.profiles p where p.user_id = auth.uid()),
      jsonb_build_object('role', 'none')
    )
  end;
$$;

-- Liste des équipes, uniquement avec le bon code club (null sinon)
create or replace function public.club_teams(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.club c where c.code = p_code) then coalesce(
      (select jsonb_agg(t.data ->> 'name' order by t.data ->> 'name') from public.teams t),
      '[]'::jsonb
    )
  end;
$$;

-- Rattache le compte connecté au club. Un compte déjà rattaché garde son équipe :
-- seul un coach peut la changer.
create or replace function public.join_club(p_code text, p_name text, p_team text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion_requise';
  end if;
  if not exists (select 1 from public.club c where c.code = p_code) then
    raise exception 'code_invalide';
  end if;
  if not exists (select 1 from public.teams t where t.data ->> 'name' = p_team) then
    raise exception 'equipe_inconnue';
  end if;
  insert into public.profiles (user_id, email, name, team)
  values (auth.uid(), auth.jwt() ->> 'email', trim(p_name), p_team)
  on conflict (user_id) do nothing;
end;
$$;

-- Consultation par un joueur : seulement ce qui est publié pour son équipe,
-- et seulement les champs listés ici (ni notes des coachs, ni présences, ni effectif).
create or replace function public.player_view()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with team as (
    select p.team as name, lower(trim(p.team)) as key
    from public.profiles p
    where p.user_id = auth.uid()
  ),
  shared as (
    select s.data
    from public.sessions s, team
    where s.data -> 'published' = 'true'::jsonb and lower(trim(s.data ->> 'team')) = team.key
  )
  select jsonb_build_object(
    'team', team.name,
    'plays', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.data -> 'id', 'name', p.data -> 'name', 'category', p.data -> 'category',
        'description', p.data -> 'description', 'court', p.data -> 'court', 'defense', p.data -> 'defense',
        'start', p.data -> 'start', 'ball', p.data -> 'ball', 'steps', p.data -> 'steps',
        'updatedAt', p.data -> 'updatedAt'))
      from public.plays p
      where exists (
        select 1
        from jsonb_array_elements_text(
          case when jsonb_typeof(p.data -> 'teams') = 'array' then p.data -> 'teams' else '[]'::jsonb end
        ) as shared_with(name)
        where lower(trim(shared_with.name)) = team.key
      )
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', data -> 'id', 'team', data -> 'team', 'date', data -> 'date', 'time', data -> 'time',
        'title', data -> 'title', 'objective', data -> 'objective', 'items', data -> 'items',
        'notes', '', 'attendance', '{}'::jsonb, 'published', true, 'updatedAt', data -> 'updatedAt'))
      from shared
    ), '[]'::jsonb),
    'drills', coalesce((
      select jsonb_agg(d.data)
      from public.drills d
      where d.id::text in (
        select item ->> 'drillId' from shared, jsonb_array_elements(shared.data -> 'items') as item
      )
    ), '[]'::jsonb)
  )
  from team;
$$;

-- Sécurité : un visiteur sans compte n'a accès à rien
revoke all on function
  public.is_coach(), public.my_access(), public.club_teams(text), public.join_club(text, text, text), public.player_view()
  from public, anon;
grant execute on function
  public.is_coach(), public.my_access(), public.club_teams(text), public.join_club(text, text, text), public.player_view()
  to authenticated;

alter table public.staff enable row level security;
alter table public.club enable row level security;
alter table public.profiles enable row level security;
revoke all on public.staff, public.club, public.profiles from anon, authenticated;
grant select on public.staff to authenticated;
grant select, update on public.club to authenticated;
grant select, update, delete on public.profiles to authenticated;

drop policy if exists "sa propre fiche" on public.staff;
create policy "sa propre fiche" on public.staff
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "coachs" on public.club;
create policy "coachs" on public.club
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists "lecture" on public.profiles;
create policy "lecture" on public.profiles
  for select to authenticated using (user_id = auth.uid() or public.is_coach());
drop policy if exists "modification par un coach" on public.profiles;
create policy "modification par un coach" on public.profiles
  for update to authenticated using (public.is_coach()) with check (public.is_coach());
drop policy if exists "retrait par un coach" on public.profiles;
create policy "retrait par un coach" on public.profiles
  for delete to authenticated using (public.is_coach());

-- Mêmes règles pour toutes les tables de contenu : réservées aux coachs
do $$
declare
  t text;
begin
  foreach t in array array['plays', 'drills', 'sessions', 'members', 'teams'] loop
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
