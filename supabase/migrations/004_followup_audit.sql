begin;
create table if not exists public.seguimiento_amigos (
 punto_id uuid primary key references public.puntos_mapa(id) on delete cascade,
 estado text not null default 'nuevo' check (estado in ('nuevo','visitado','interesado','integrado')),
 ultima_visita date,
 proxima_visita date,
 notas text not null default '',
 actualizado_en timestamptz not null default now()
);
alter table public.seguimiento_amigos enable row level security;
create policy "seguimiento lectura" on public.seguimiento_amigos for select to authenticated using (true);
create policy "seguimiento escritura" on public.seguimiento_amigos for all to authenticated
 using (exists(select 1 from public.puntos_mapa p where p.id=punto_id and (p.creado_por=auth.uid() or public.es_admin_o_lider())))
 with check (exists(select 1 from public.puntos_mapa p where p.id=punto_id and p.tipo='amigo_rojo' and (p.creado_por=auth.uid() or public.es_admin_o_lider())));
create table if not exists public.auditoria (
 id uuid primary key default extensions.gen_random_uuid(),
 fecha timestamptz not null default now(),
 usuario_id uuid,
 tabla text not null,
 registro_id text,
 accion text not null
);
alter table public.auditoria enable row level security;
create policy "auditoria lectura lideres" on public.auditoria for select to authenticated using(public.es_admin_o_lider());
create or replace function public.registrar_cambio() returns trigger language plpgsql security definer set search_path='' as $$
declare dato jsonb;
begin
 if TG_OP='DELETE' then dato=to_jsonb(OLD); else dato=to_jsonb(NEW); end if;
 insert into public.auditoria(usuario_id,tabla,registro_id,accion) values(auth.uid(),TG_TABLE_NAME,coalesce(dato->>'id',dato->>'punto_id'),TG_OP);
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end;
$$;
create trigger auditar_puntos after insert or update or delete on public.puntos_mapa for each row execute function public.registrar_cambio();
create trigger auditar_rutas after insert or update or delete on public.rutas_evangelizadas for each row execute function public.registrar_cambio();
create trigger auditar_cultos after insert or update or delete on public.historial_cultos for each row execute function public.registrar_cambio();
create trigger auditar_visitas after insert or update or delete on public.seguimiento_amigos for each row execute function public.registrar_cambio();
grant select,insert,update,delete on public.seguimiento_amigos to authenticated;
grant select on public.auditoria to authenticated;
commit;
