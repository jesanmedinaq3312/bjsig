-- Optimización RLS: fija auth.* en init-plans para evitar reevaluación por fila.
-- Se preservan nombres, roles, comandos, modo PERMISSIVE/RESTRICTIVE y expresiones.
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
        OR position('auth.uid()' in coalesce(with_check, '')) > 0
        OR position('auth.role()' in coalesce(with_check, '')) > 0
        OR position('auth.jwt()' in coalesce(with_check, '')) > 0
        OR position('current_setting(' in coalesce(qual, '')) > 0
        OR position('current_setting(' in coalesce(with_check, '')) > 0
      )
  LOOP
    q := replace(replace(replace(coalesce(p.qual, ''), 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())'), 'auth.jwt()', '(select auth.jwt())');
    q := replace(q, '(select (select auth.uid()))', '(select auth.uid())');
    q := replace(q, '(select (select auth.role()))', '(select auth.role())');
    q := replace(q, '(select (select auth.jwt()))', '(select auth.jwt())');
    c := replace(replace(replace(coalesce(p.with_check, ''), 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())'), 'auth.jwt()', '(select auth.jwt())');
    c := replace(c, '(select (select auth.uid()))', '(select auth.uid())');
    c := replace(c, '(select (select auth.role()))', '(select auth.role())');
    c := replace(c, '(select (select auth.jwt()))', '(select auth.jwt())');
    role_sql := array_to_string(p.roles, ', ');
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    create_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s', p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd, role_sql);
    IF p.qual IS NOT NULL THEN create_sql := create_sql || format(' USING (%s)', q); END IF;
    IF p.with_check IS NOT NULL THEN create_sql := create_sql || format(' WITH CHECK (%s)', c); END IF;
    EXECUTE create_sql;
  END LOOP;
END $$;
