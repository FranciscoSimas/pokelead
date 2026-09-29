-- Visual shiny sprite flag (Showdown GIF). Optional; defaults false.
alter table public.box_pokemon
  add column if not exists flag_shiny boolean not null default false;
