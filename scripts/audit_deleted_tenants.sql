-- Auditoría: datos de empresas eliminadas o archivadas (solo lectura).
-- Ejecutar en el editor SQL del backend.

-- 1) Identidad visual huérfana (empresa ya no existe)
select b.tenant_id, b.company_name
from public.tenant_branding b
left join public.tenants t on t.id = b.tenant_id
where t.id is null;

-- 2) Identidad visual de empresas archivadas
select t.id, t.name, t.status, t.active
from public.tenants t
join public.tenant_branding b on b.tenant_id = t.id
where t.status = 'cortada' or t.active = false;

-- 3) Definición actual de la función que alimenta la pantalla
select pg_get_functiondef('public.fetch_saas_tenant_branding()'::regprocedure);

-- 4) Claves foráneas hacia tenants y su comportamiento al borrar
select conrelid::regclass as tabla, conname,
       case confdeltype when 'c' then 'cascade' when 'r' then 'restrict'
            when 'a' then 'no action' when 'n' then 'set null' end as on_delete
from pg_constraint
where confrelid = 'public.tenants'::regclass and contype = 'f'
order by 1;

-- 5) Tablas con RLS desactivado en public
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
