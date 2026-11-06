-- Read-only catalog assertion for CI/staging. Does not query application rows.
DO $$
DECLARE
  missing_rls text;
BEGIN
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
    INTO missing_rls
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_attribute AS a ON a.attrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND NOT c.relrowsecurity;

  IF missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'RLS is not enabled on public tenant tables: %', missing_rls;
  END IF;
END
$$;

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_attribute AS a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND a.attname = 'tenant_id'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname;
