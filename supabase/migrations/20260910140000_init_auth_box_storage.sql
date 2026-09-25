-- Applied remotely as init_auth_box_storage. Kept in-repo for reference.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  migrated_local_box boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.box_pokemon (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  species_id text not null,
  species_name text not null,
  dex integer not null,
  form_label text,
  cp integer not null,
  atk_iv smallint not null check (atk_iv between 0 and 15),
  def_iv smallint not null check (def_iv between 0 and 15),
  hp_iv smallint not null check (hp_iv between 0 and 15),
  level numeric,
  fast_move text,
  charged_moves text[] not null default '{}'::text[],
  flag_shadow boolean not null default false,
  flag_purified boolean not null default false,
  flag_lucky boolean not null default false,
  flag_best_buddy boolean not null default false,
  flag_xl boolean not null default false,
  tags text[] not null default '{}'::text[],
  note text,
  screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index box_pokemon_user_id_idx on public.box_pokemon (user_id);
create index box_pokemon_user_species_idx on public.box_pokemon (user_id, species_id);

create table public.saved_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Team',
  league_cp integer not null,
  cup text not null default 'all',
  lead jsonb not null,
  switch jsonb not null,
  closer jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_teams_user_id_idx on public.saved_teams (user_id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger box_pokemon_updated_at
  before update on public.box_pokemon
  for each row execute function private.set_updated_at();

create trigger saved_teams_updated_at
  before update on public.saved_teams
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.box_pokemon enable row level security;
alter table public.saved_teams enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.box_pokemon to authenticated;
grant select, insert, update, delete on public.saved_teams to authenticated;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "box_pokemon_select_own"
  on public.box_pokemon for select to authenticated
  using (user_id = (select auth.uid()));

create policy "box_pokemon_insert_own"
  on public.box_pokemon for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "box_pokemon_update_own"
  on public.box_pokemon for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "box_pokemon_delete_own"
  on public.box_pokemon for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_teams_select_own"
  on public.saved_teams for select to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_teams_insert_own"
  on public.saved_teams for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "saved_teams_update_own"
  on public.saved_teams for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "saved_teams_delete_own"
  on public.saved_teams for delete to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'screenshots',
    'screenshots',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
  );

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "screenshots_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "screenshots_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "screenshots_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

create policy "screenshots_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
