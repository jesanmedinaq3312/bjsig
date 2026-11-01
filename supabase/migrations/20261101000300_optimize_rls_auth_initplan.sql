-- BJSIG: optimización de políticas RLS.
-- Reemplaza llamadas auth.* y current_setting por init-plans equivalentes.
-- Aplicado en BJSIG mediante la migración remota 20261101204800.
-- Rollback: restaurar cada política desde el dump de esquema previo.

DO $$
DECLARE
  p record;
  role_sql text;
  create_sql text;
  q text;
  c text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        position('auth.uid()' in coalesce(qual, '')) > 0
        OR position('auth.role()' in coalesce(qual, '')) > 0
        OR position('auth.jwt()' in coalesce(qual, '')) > 0
        OR position('current_setting(' in coalesce(qual, '')) > 0
        OR position('auth.uid()' in coalesce(with_check, '')) > 0
        OR position('auth.role()' in coalesce(with_check, '')) > 0
        OR position('auth.jwt()' in coalesce(with_check, '')) > 0
        OR position('current_setting(' in coalesce(with_check, '')) > 0
      )
  LOOP
    q := regexp_replace(coalesce(p.qual, ''), 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
    q := regexp_replace(q, 'current_setting\(([^()]*)\)', '(select current_setting(\1))', 'g');
    c := regexp_replace(coalesce(p.with_check, ''), 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
    c := regexp_replace(c, 'current_setting\(([^()]*)\)', '(select current_setting(\1))', 'g');
    role_sql := array_to_string(p.roles, ', ');
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    create_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s', p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd, role_sql);
    IF p.qual IS NOT NULL THEN create_sql := create_sql || format(' USING (%s)', q); END IF;
    IF p.with_check IS NOT NULL THEN create_sql := create_sql || format(' WITH CHECK (%s)', c); END IF;
    EXECUTE create_sql;
  END LOOP;
END $$;
