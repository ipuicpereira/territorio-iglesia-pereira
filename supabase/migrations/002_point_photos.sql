alter table public.puntos_mapa
  add column if not exists fotos_urls text[] not null default '{}'::text[];

comment on column public.puntos_mapa.fotos_urls is
  'Fotos comprimidas del hermano o amigo almacenadas en el bucket fotos-cultos.';
