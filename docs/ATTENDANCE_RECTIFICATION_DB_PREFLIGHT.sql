-- Read-only preflight for attendance rectification SQL.
-- Run in the target Supabase project's SQL editor before applying the hardening
-- migration. This inspects catalog metadata only; it does not read business rows.

-- Definitions, owners, SECURITY DEFINER flag, configured search_path, and
-- EXECUTE privileges for helpers, response RPC, and private trigger functions.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  p.proconfig AS function_settings,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  pg_catalog.pg_get_functiondef(p.oid) AS function_definition
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
  AND p.proname IN (
    'current_tenant_id',
    'current_worker_rut',
    'current_user_email',
    'respond_attendance_rectification',
    'rectification_seal',
    'validate_attendance_rectification_scan_event'
  )
ORDER BY p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
LIMIT 20;

-- Table constraints (including CHECK/FK validation state) and policies.
SELECT
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  c.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(c.oid, true) AS definition
FROM pg_catalog.pg_constraint AS c
WHERE c.conrelid = pg_catalog.to_regclass('public.attendance_rectifications')
ORDER BY c.conname
LIMIT 50;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'attendance_rectifications'
ORDER BY policyname
LIMIT 50;

-- Trigger inventory: confirm the row-seal, cross-scope validator, and delete
-- blocker are enabled on the table.
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled_state,
  pg_catalog.pg_get_triggerdef(t.oid, true) AS definition
FROM pg_catalog.pg_trigger AS t
WHERE t.tgrelid = pg_catalog.to_regclass('public.attendance_rectifications')
  AND NOT t.tgisinternal
ORDER BY t.tgname
LIMIT 50;
