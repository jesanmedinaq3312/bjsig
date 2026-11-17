#!/usr/bin/env bash
set -Eeuo pipefail

# Applies exactly one Supabase migration to a staging project. Default mode is
# read-only preflight; mutation requires --apply and an exact confirmation token.
readonly MIGRATION_VERSION="20261117130000"
readonly MIGRATION_BASENAME="20261117130000_server_attendance_authorization.sql"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly MIGRATION_FILE="${REPO_ROOT}/supabase/migrations/${MIGRATION_BASENAME}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/apply-attendance-migration-staging.sh [--dry-run | --apply]

Default/--dry-run performs a read-only check against staging and prints the
migration(s) that would be pending. --apply runs only the attendance migration,
then records it in Supabase's remote migration history.

Required environment:
  SUPABASE_STAGING_PROJECT_REF       20-character staging project ref
  SUPABASE_PRODUCTION_PROJECT_REF    production ref; must differ from staging
  SUPABASE_STAGING_DB_PASSWORD       database password for staging
  SUPABASE_ACCESS_TOKEN              required only with --apply
  CONFIRM_STAGING_ATTENDANCE_MIGRATION
    must equal APPLY_STAGING:<staging-ref>:20261117130000 when using --apply

The script connects to db.<staging-ref>.supabase.co directly. It never reads a
linked project ref and aborts if any migration other than the target is pending.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

MODE="dry-run"
case "${1:-}" in
  ""|--dry-run)
    MODE="dry-run"
    ;;
  --apply)
    MODE="apply"
    ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage >&2
    die "opción desconocida: $1"
    ;;
esac
[[ $# -le 1 ]] || die "acepta como máximo una opción"

: "${SUPABASE_STAGING_PROJECT_REF:?define SUPABASE_STAGING_PROJECT_REF}"
: "${SUPABASE_PRODUCTION_PROJECT_REF:?define SUPABASE_PRODUCTION_PROJECT_REF}"
: "${SUPABASE_STAGING_DB_PASSWORD:?define SUPABASE_STAGING_DB_PASSWORD}"

[[ "$SUPABASE_STAGING_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]] \
  || die "SUPABASE_STAGING_PROJECT_REF debe tener 20 caracteres alfanuméricos en minúscula"
[[ "$SUPABASE_PRODUCTION_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]] \
  || die "SUPABASE_PRODUCTION_PROJECT_REF debe tener 20 caracteres alfanuméricos en minúscula"
[[ "$SUPABASE_STAGING_PROJECT_REF" != "$SUPABASE_PRODUCTION_PROJECT_REF" ]] \
  || die "staging y producción apuntan al mismo project ref; se cancela"
[[ -f "$MIGRATION_FILE" ]] || die "no se encuentra la migración: $MIGRATION_FILE"
command -v psql >/dev/null 2>&1 || die "se requiere psql"

if [[ "$MODE" == "apply" ]]; then
  : "${SUPABASE_ACCESS_TOKEN:?define SUPABASE_ACCESS_TOKEN para --apply}"
  : "${CONFIRM_STAGING_ATTENDANCE_MIGRATION:?define la confirmación exacta para --apply}"
  command -v supabase >/dev/null 2>&1 || die "se requiere Supabase CLI para --apply"
  expected_confirmation="APPLY_STAGING:${SUPABASE_STAGING_PROJECT_REF}:${MIGRATION_VERSION}"
  [[ "$CONFIRM_STAGING_ATTENDANCE_MIGRATION" == "$expected_confirmation" ]] \
    || die "confirmación incorrecta; se esperaba CONFIRM_STAGING_ATTENDANCE_MIGRATION=$expected_confirmation"
fi

contains_version() {
  local wanted="$1"
  shift
  local candidate
  for candidate in "$@"; do
    [[ "$candidate" == "$wanted" ]] && return 0
  done
  return 1
}

local_versions=()
for path in "${REPO_ROOT}"/supabase/migrations/[0-9]*_*.sql; do
  [[ -f "$path" ]] || continue
  basename="${path##*/}"
  version="${basename%%_*}"
  [[ "$version" =~ ^[0-9]+$ ]] || continue
  contains_version "$version" "${local_versions[@]}" \
    && die "versión local duplicada: $version"
  local_versions+=("$version")
done
contains_version "$MIGRATION_VERSION" "${local_versions[@]}" \
  || die "la versión objetivo no está en supabase/migrations"

readonly DB_HOST="db.${SUPABASE_STAGING_PROJECT_REF}.supabase.co"
readonly DB_PORT="5432"
readonly DB_NAME="postgres"
readonly DB_USER="postgres"

read_remote_versions() {
  PGPASSWORD="$SUPABASE_STAGING_DB_PASSWORD" \
  PGSSLMODE=require \
  psql -X -qAt -v ON_ERROR_STOP=1 \
    --host "$DB_HOST" --port "$DB_PORT" --username "$DB_USER" --dbname "$DB_NAME" \
    --command 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;'
}

remote_raw="$(read_remote_versions)" \
  || die "no se pudo leer el historial de migraciones de staging"
remote_versions=()
while IFS= read -r version; do
  [[ -n "$version" ]] || continue
  [[ "$version" =~ ^[0-9]+$ ]] || die "versión remota inválida en schema_migrations: $version"
  remote_versions+=("$version")
done <<< "$remote_raw"

for version in "${remote_versions[@]}"; do
  contains_version "$version" "${local_versions[@]}" \
    || die "staging contiene una migración no presente localmente ($version); sincroniza el repositorio primero"
done

pending_versions=()
for version in "${local_versions[@]}"; do
  contains_version "$version" "${remote_versions[@]}" || pending_versions+=("$version")
done

if contains_version "$MIGRATION_VERSION" "${remote_versions[@]}"; then
  [[ ${#pending_versions[@]} -eq 0 ]] \
    || die "la migración objetivo ya figura aplicada, pero hay otras pendientes: ${pending_versions[*]}"
  printf 'OK: %s ya está aplicada en staging (%s). No se realizaron cambios.\n' \
    "$MIGRATION_VERSION" "$SUPABASE_STAGING_PROJECT_REF"
  exit 0
fi

[[ ${#pending_versions[@]} -eq 1 && "${pending_versions[0]}" == "$MIGRATION_VERSION" ]] \
  || die "solo se permite aplicar la migración objetivo; pendientes detectadas: ${pending_versions[*]:-(ninguna)}"

printf 'Destino verificado: STAGING %s (producción configurada: %s)\n' \
  "$SUPABASE_STAGING_PROJECT_REF" "$SUPABASE_PRODUCTION_PROJECT_REF"
printf 'Migración pendiente única: %s\n' "$MIGRATION_BASENAME"

if [[ "$MODE" == "dry-run" ]]; then
  printf 'Preflight terminado sin cambios. Para aplicar, usa --apply y la confirmación exacta indicada en --help.\n'
  exit 0
fi

printf 'Aplicando SQL con una sola transacción...\n'
PGPASSWORD="$SUPABASE_STAGING_DB_PASSWORD" \
PGSSLMODE=require \
psql -X -v ON_ERROR_STOP=1 --single-transaction \
  --host "$DB_HOST" --port "$DB_PORT" --username "$DB_USER" --dbname "$DB_NAME" \
  --file "$MIGRATION_FILE"

printf 'Registrando la versión aplicada en el historial remoto de Supabase...\n'
SUPABASE_DB_PASSWORD="$SUPABASE_STAGING_DB_PASSWORD" \
supabase migration repair "$MIGRATION_VERSION" \
  --status applied \
  --remote="$SUPABASE_STAGING_PROJECT_REF" \
  --yes

remote_after="$(read_remote_versions)" \
  || die "SQL aplicada, pero no se pudo verificar el historial remoto; inspecciona staging antes de reintentar"
while IFS= read -r version; do
  [[ "$version" == "$MIGRATION_VERSION" ]] && {
    printf 'Éxito: %s aplicada y registrada en staging %s.\n' \
      "$MIGRATION_VERSION" "$SUPABASE_STAGING_PROJECT_REF"
    exit 0
  }
done <<< "$remote_after"
die "el comando terminó, pero la versión no aparece en schema_migrations; revisa staging"
