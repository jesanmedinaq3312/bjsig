#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL must point to a non-production/staging database for the tenant RLS catalog check." >&2
  exit 2
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run the tenant RLS catalog check." >&2
  exit 2
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
psql --no-psqlrc --set ON_ERROR_STOP=1 "$SUPABASE_DB_URL" --file "$script_dir/audit_tenant_rls.sql"
