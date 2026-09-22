alter table public.rutas_evangelizadas
  add column if not exists color text not null default '#eab02f';

alter table public.rutas_evangelizadas
  drop constraint if exists rutas_color_hex_valido;

alter table public.rutas_evangelizadas
  add constraint rutas_color_hex_valido
  check (color ~ '^#[0-9A-Fa-f]{6}$');
