-- Esquema inicial para la PWA GIS de la iglesia.
-- Ejecutar completo en Supabase > SQL Editor.

begin;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.rol_usuario as enum (
  'admin',
  'lider',
  'evangelizador'
);

create type public.tipo_punto_mapa as enum (
  'hermano_verde',
  'amigo_rojo',
  'culto_azul'
);

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol public.rol_usuario not null default 'evangelizador',
  nombre_completo text not null check (char_length(trim(nombre_completo)) > 0),
  creado_en timestamptz not null default now()
);

-- Crea automáticamente la extensión de perfil cuando Auth registra un usuario.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nombre_completo'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      new.email,
      'Usuario'
    )
  );
  return new;
end;
$$;

create trigger al_crear_usuario_auth
  after insert on auth.users
  for each row execute procedure public.crear_perfil_nuevo_usuario();

create table public.puntos_mapa (
  id uuid primary key default extensions.gen_random_uuid(),
  tipo public.tipo_punto_mapa not null,
  nombre_identificador text not null check (char_length(trim(nombre_identificador)) > 0),
  direccion text not null check (char_length(trim(direccion)) > 0),
  telefono text,
  coordenada extensions.geometry(Point, 4326) not null,
  creado_por uuid not null references public.perfiles(id) on delete restrict,
  creado_en timestamptz not null default now(),
  constraint puntos_mapa_coordenada_valida check (extensions.st_isvalid(coordenada))
);

create table public.historial_cultos (
  id uuid primary key default extensions.gen_random_uuid(),
  punto_id uuid not null references public.puntos_mapa(id) on delete cascade,
  fecha_culto date not null,
  asistentes integer not null check (asistentes >= 0),
  notas text,
  fotos_urls text[] not null default '{}'::text[],
  creado_en timestamptz not null default now()
);

create table public.rutas_evangelizadas (
  id uuid primary key default extensions.gen_random_uuid(),
  ruta_recorrida extensions.geometry(LineString, 4326) not null,
  fecha_recorrido timestamptz not null default now(),
  creado_por uuid not null references public.perfiles(id) on delete restrict,
  creado_en timestamptz not null default now(),
  constraint rutas_minimo_dos_puntos check (extensions.st_npoints(ruta_recorrida) >= 2),
  constraint rutas_geometria_valida check (extensions.st_isvalid(ruta_recorrida))
);

create index puntos_mapa_coordenada_gix
  on public.puntos_mapa using gist (coordenada);
create index puntos_mapa_creado_por_idx
  on public.puntos_mapa (creado_por);
create index historial_cultos_punto_fecha_idx
  on public.historial_cultos (punto_id, fecha_culto desc);
create index rutas_evangelizadas_ruta_gix
  on public.rutas_evangelizadas using gist (ruta_recorrida);
create index rutas_evangelizadas_creado_por_idx
  on public.rutas_evangelizadas (creado_por);

-- Todos los usuarios autenticados de esta única iglesia pueden consultar los datos.
-- Admin/líder pueden administrar todo; evangelizadores administran sus propios puntos/rutas.
alter table public.perfiles enable row level security;
alter table public.puntos_mapa enable row level security;
alter table public.historial_cultos enable row level security;
alter table public.rutas_evangelizadas enable row level security;

create or replace function public.es_admin_o_lider()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and rol in ('admin'::public.rol_usuario, 'lider'::public.rol_usuario)
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and rol = 'admin'::public.rol_usuario
  );
$$;

-- Impide que un usuario se ascienda modificando su propio perfil.
create or replace function public.proteger_cambio_de_rol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol
     and (select auth.uid()) is not null
     and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end;
$$;

create trigger antes_de_cambiar_rol
  before update of rol on public.perfiles
  for each row execute procedure public.proteger_cambio_de_rol();

revoke all on function public.es_admin_o_lider() from public;
grant execute on function public.es_admin_o_lider() to authenticated;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

create policy "perfiles: leer autenticados"
on public.perfiles for select to authenticated
using (true);

create policy "perfiles: actualizar propio o admin/lider"
on public.perfiles for update to authenticated
using (id = (select auth.uid()) or public.es_admin_o_lider())
with check (id = (select auth.uid()) or public.es_admin_o_lider());

create policy "puntos: leer autenticados"
on public.puntos_mapa for select to authenticated
using (true);

create policy "puntos: insertar propios"
on public.puntos_mapa for insert to authenticated
with check (creado_por = (select auth.uid()));

create policy "puntos: actualizar propios o admin/lider"
on public.puntos_mapa for update to authenticated
using (creado_por = (select auth.uid()) or public.es_admin_o_lider())
with check (creado_por = (select auth.uid()) or public.es_admin_o_lider());

create policy "puntos: borrar propios o admin/lider"
on public.puntos_mapa for delete to authenticated
using (creado_por = (select auth.uid()) or public.es_admin_o_lider());

create policy "cultos: leer autenticados"
on public.historial_cultos for select to authenticated
using (true);

create policy "cultos: insertar autenticados"
on public.historial_cultos for insert to authenticated
with check (true);

create policy "cultos: actualizar autenticados"
on public.historial_cultos for update to authenticated
using (true) with check (true);

create policy "cultos: borrar admin/lider"
on public.historial_cultos for delete to authenticated
using (public.es_admin_o_lider());

create policy "rutas: leer autenticados"
on public.rutas_evangelizadas for select to authenticated
using (true);

create policy "rutas: insertar propias"
on public.rutas_evangelizadas for insert to authenticated
with check (creado_por = (select auth.uid()));

create policy "rutas: actualizar propias o admin/lider"
on public.rutas_evangelizadas for update to authenticated
using (creado_por = (select auth.uid()) or public.es_admin_o_lider())
with check (creado_por = (select auth.uid()) or public.es_admin_o_lider());

create policy "rutas: borrar propias o admin/lider"
on public.rutas_evangelizadas for delete to authenticated
using (creado_por = (select auth.uid()) or public.es_admin_o_lider());

-- Bucket público: las URLs pueden verse sin sesión; solo usuarios autenticados escriben.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-cultos',
  'fotos-cultos',
  true,
  307200,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos-cultos: lectura publica"
on storage.objects for select to public
using (bucket_id = 'fotos-cultos');

create policy "fotos-cultos: subir autenticados"
on storage.objects for insert to authenticated
with check (bucket_id = 'fotos-cultos');

create policy "fotos-cultos: actualizar autenticados"
on storage.objects for update to authenticated
using (bucket_id = 'fotos-cultos')
with check (bucket_id = 'fotos-cultos');

create policy "fotos-cultos: borrar autenticados"
on storage.objects for delete to authenticated
using (bucket_id = 'fotos-cultos');

commit;
