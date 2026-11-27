-- Chaque système, exercice et séance appartient au coach qui l'a créé.
-- Tous les coachs peuvent les consulter ; seul leur auteur peut les modifier ou les supprimer.
-- Les équipes, l'effectif, les comptes joueurs et le code du club restent communs aux coachs.

-- Droit de modifier : en être l'auteur. Le contenu d'une personne qui n'est plus coach
-- reste modifiable par les autres, pour ne pas rester bloqué.
create or replace function public.can_edit(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_coach() and (
    owner = auth.uid() or not exists (select 1 from public.staff s where s.user_id = owner)
  );
$$;

-- L'auteur est fixé par le serveur à la création et ne change plus.
create or replace function public.set_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
  elsif auth.uid() is not null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['plays', 'drills', 'sessions'] loop
    execute format('alter table public.%I add column if not exists owner_id uuid', t);

    -- Contenus déjà créés : leur dernier auteur connu, sinon le premier coach.
    -- Les déclencheurs sont suspendus pour ne pas changer leur date de modification.
    execute format('alter table public.%I disable trigger user', t);
    execute format(
      'update public.%I set owner_id = coalesce(
         (select s.user_id from public.staff s where s.user_id = updated_by),
         (select s.user_id from public.staff s order by s.added_at limit 1))
       where owner_id is null', t);
    execute format('alter table public.%I enable trigger user', t);

    execute format('alter table public.%I alter column owner_id set default auth.uid()', t);
    execute format('drop trigger if exists keep_owner on public.%I', t);
    execute format('create trigger keep_owner before insert or update on public.%I for each row execute function public.set_owner()', t);

    execute format('drop policy if exists "coachs" on public.%I', t);
    execute format('drop policy if exists "lecture par les coachs" on public.%I', t);
    execute format('create policy "lecture par les coachs" on public.%I for select to authenticated using (public.is_coach())', t);
    execute format('drop policy if exists "creation par un coach" on public.%I', t);
    execute format('create policy "creation par un coach" on public.%I for insert to authenticated with check (public.is_coach() and owner_id = auth.uid())', t);
    execute format('drop policy if exists "modification par son auteur" on public.%I', t);
    execute format('create policy "modification par son auteur" on public.%I for update to authenticated using (public.can_edit(owner_id)) with check (public.can_edit(owner_id))', t);
    execute format('drop policy if exists "suppression par son auteur" on public.%I', t);
    execute format('create policy "suppression par son auteur" on public.%I for delete to authenticated using (public.can_edit(owner_id))', t);
  end loop;
end;
$$;

-- Les coachs voient le nom des autres coachs et choisissent le leur.
drop policy if exists "les coachs se voient" on public.staff;
create policy "les coachs se voient" on public.staff
  for select to authenticated using (public.is_coach());

grant update (name) on public.staff to authenticated;
drop policy if exists "choisir son nom" on public.staff;
create policy "choisir son nom" on public.staff
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on function public.can_edit(uuid), public.set_owner() from public, anon;
grant execute on function public.can_edit(uuid) to authenticated;
