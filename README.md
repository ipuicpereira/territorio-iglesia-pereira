# Territorio Iglesia Pereira

PWA GIS privada para administrar hermanos, amigos, lugares de culto y rutas de evangelización. Usa Next.js App Router, Leaflet/OpenStreetMap y Supabase con PostGIS.

## Configuración

1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/migrations/001_initial_schema.sql` en el SQL Editor.
3. Copia `.env.example` como `.env.local` y completa la URL del proyecto y la clave anónima pública.
4. En Supabase Authentication crea el primer usuario y luego asígnale el rol `admin` desde el SQL Editor.
5. Ejecuta `pnpm dev` para desarrollo o `pnpm build` para generar el sitio estático.

```sql
update public.perfiles
set rol = 'admin'
where id = 'UUID_DEL_PRIMER_USUARIO';
```

## Seguridad y datos

- Las tablas tienen Row Level Security.
- Las fotos de cultos se comprimen a WebP en el navegador y el bucket rechaza archivos mayores de 300 KB.
- El bucket es público por requerimiento; no deben subirse fotos sensibles sin consentimiento.
- El polígono territorial es aproximado y debe validarse antes de uso operativo.

