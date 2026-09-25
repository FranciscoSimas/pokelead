-- Scale indexes + light row constraints (applied remotely as scale_indexes_and_constraints)

create index if not exists box_pokemon_user_created_idx
  on public.box_pokemon (user_id, created_at desc);

create index if not exists box_pokemon_user_updated_idx
  on public.box_pokemon (user_id, updated_at desc);

create index if not exists saved_teams_user_format_created_idx
  on public.saved_teams (user_id, league_cp, cup, created_at desc);

drop index if exists public.box_pokemon_user_id_idx;
drop index if exists public.saved_teams_user_id_idx;

alter table public.box_pokemon
  drop constraint if exists box_pokemon_cp_range;
alter table public.box_pokemon
  add constraint box_pokemon_cp_range check (cp between 10 and 10000);

alter table public.box_pokemon
  drop constraint if exists box_pokemon_tags_len;
alter table public.box_pokemon
  add constraint box_pokemon_tags_len check (cardinality(tags) <= 32);

alter table public.box_pokemon
  drop constraint if exists box_pokemon_charged_len;
alter table public.box_pokemon
  add constraint box_pokemon_charged_len check (cardinality(charged_moves) <= 4);

alter table public.box_pokemon
  drop constraint if exists box_pokemon_note_len;
alter table public.box_pokemon
  add constraint box_pokemon_note_len check (note is null or char_length(note) <= 500);

alter table public.saved_teams
  drop constraint if exists saved_teams_name_len;
alter table public.saved_teams
  add constraint saved_teams_name_len check (char_length(name) between 1 and 80);

alter table public.saved_teams
  drop constraint if exists saved_teams_league_cp_valid;
alter table public.saved_teams
  add constraint saved_teams_league_cp_valid check (league_cp in (500, 1500, 2500, 10000));
