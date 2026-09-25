-- Home page hero showcase (3 species picks) synced when signed in.

alter table public.profiles
  add column if not exists home_showcase jsonb;

comment on column public.profiles.home_showcase is
  'Three home hero sprites: [{speciesId,dex,speciesName}, ...]';
