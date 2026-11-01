-- Fase 12: Gobierno de Datos para la operación SaaS.
-- Todas las entidades quedan restringidas al dueño/operador de plataforma.
-- No se almacenan credenciales, tokens ni contenido de documentos.

create table if not exists public.saas_data_governance_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete restrict,
  maturity_level text not null default 'initial' check (maturity_level in ('initial','developing','managed','advanced')),
  treatment_owner text,
  security_contact text,
  emergency_contact text,
  storage_region text,
  default_retention_days integer check (default_retention_days is null or default_retention_days >= 0),
  has_personal_data boolean not null default false,
  has_sensitive_data boolean not null default false,
  document_review_status text not null default 'pending' check (document_review_status in ('pending','in_review','verified','expired')),
  last_reviewed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_data_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  description text,
  source_system text,
  data_category text not null default 'other',
  sensitivity_level text not null default 'internal' check (sensitivity_level in ('public','internal','confidential','personal','sensitive')),
  owner_name text,
  location text,
  record_count bigint not null default 0 check (record_count >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  sync_frequency text,
  last_synced_at timestamptz,
  retention_days integer check (retention_days is null or retention_days >= 0),
  status text not null default 'pending_review' check (status in ('active','paused','archived','pending_review')),
  contains_personal_data boolean not null default false,
  contains_sensitive_data boolean not null default false,
  has_backup boolean not null default false,
  last_backup_at timestamptz,
  legal_hold boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  job_title text,
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text,
  whatsapp text,
  contact_type text not null default 'support' check (contact_type in ('legal_representative','administrator','it','security','billing','hr_prevention','emergency','support')),
  is_primary boolean not null default false,
  can_authorize_changes boolean not null default false,
  can_view_data boolean not null default false,
  verified_at timestamptz,
  status text not null default 'active' check (status in ('active','inactive','pending_verification')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_tenant_usage_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  usage_date date not null,
  active_users integer not null default 0 check (active_users >= 0),
  records_count bigint not null default 0 check (records_count >= 0),
  files_count bigint not null default 0 check (files_count >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  processing_jobs integer not null default 0 check (processing_jobs >= 0),
  imports_count integer not null default 0 check (imports_count >= 0),
  exports_count integer not null default 0 check (exports_count >= 0),
  api_calls integer not null default 0 check (api_calls >= 0),
  webhook_calls integer not null default 0 check (webhook_calls >= 0),
  processing_errors integer not null default 0 check (processing_errors >= 0),
  plan_storage_limit_bytes bigint,
  calculated_at timestamptz not null default now(),
  unique (tenant_id, usage_date)
);

create table if not exists public.saas_data_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  request_type text not null check (request_type in ('export','archive','deletion','retention_review')),
  status text not null default 'requested' check (status in ('requested','under_review','approved','scheduled','completed','rejected','cancelled')),
  asset_id uuid references public.saas_data_assets(id) on delete restrict,
  requested_by text,
  reason text not null check (length(trim(reason)) between 5 and 2000),
  scope_description text,
  scheduled_for timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  evidence_storage_path text,
  result_summary text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_data_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  classification text,
  outcome text not null default 'success' check (outcome in ('success','denied','failed')),
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.saas_data_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  title text not null check (length(trim(title)) between 3 and 200),
  description text not null check (length(trim(description)) between 5 and 5000),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','contained','resolved','closed')),
  asset_id uuid references public.saas_data_assets(id) on delete restrict,
  assigned_to text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  actions_taken text,
  evidence_storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_data_assets_tenant_status on public.saas_data_assets(tenant_id, status, sensitivity_level);
create index if not exists idx_saas_data_assets_retention on public.saas_data_assets(tenant_id, retention_days, legal_hold);
create index if not exists idx_saas_tenant_contacts_tenant_status on public.saas_tenant_contacts(tenant_id, status, contact_type);
create index if not exists idx_saas_usage_daily_tenant_date on public.saas_tenant_usage_daily(tenant_id, usage_date desc);
create index if not exists idx_saas_data_requests_tenant_status on public.saas_data_requests(tenant_id, status, created_at desc);
create index if not exists idx_saas_data_audit_tenant_created on public.saas_data_audit_events(tenant_id, created_at desc);
create index if not exists idx_saas_data_incidents_tenant_status on public.saas_data_incidents(tenant_id, status, severity, detected_at desc);

alter table public.saas_data_governance_profiles enable row level security;
alter table public.saas_data_assets enable row level security;
alter table public.saas_tenant_contacts enable row level security;
alter table public.saas_tenant_usage_daily enable row level security;
alter table public.saas_data_requests enable row level security;
alter table public.saas_data_audit_events enable row level security;
alter table public.saas_data_incidents enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['saas_data_governance_profiles','saas_data_assets','saas_tenant_contacts','saas_tenant_usage_daily','saas_data_requests','saas_data_audit_events','saas_data_incidents'] loop
    execute format('drop policy if exists %I_platform_owner on public.%I', table_name, table_name);
    execute format('create policy %I_platform_owner on public.%I for all to authenticated using (public.is_platform_owner()) with check (public.is_platform_owner())', table_name, table_name);
  end loop;
end $$;

create or replace function public.touch_saas_governance_updated_at()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['saas_data_governance_profiles','saas_data_assets','saas_tenant_contacts','saas_data_requests','saas_data_incidents'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.touch_saas_governance_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.record_saas_data_audit(
  _tenant_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid default null,
  _classification text default null,
  _outcome text default 'success',
  _metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = public, pg_temp
as $$
declare result_id uuid;
begin
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  insert into public.saas_data_audit_events(tenant_id, actor_user_id, action, resource_type, resource_id, classification, outcome, metadata)
  values (_tenant_id, auth.uid(), left(_action, 120), left(_resource_type, 80), _resource_id, left(_classification, 40), _outcome, coalesce(_metadata, '{}'::jsonb) - 'password' - 'token' - 'secret' - 'credential')
  returning id into result_id;
  return result_id;
end $$;

revoke all on function public.record_saas_data_audit(uuid,text,text,uuid,text,text,jsonb) from public;
grant execute on function public.record_saas_data_audit(uuid,text,text,uuid,text,text,jsonb) to authenticated;

comment on table public.saas_data_assets is 'Inventario de conjuntos de datos, sin contenido de documentos ni credenciales.';
comment on table public.saas_data_requests is 'Solicitudes revisables; la primera versión no ejecuta eliminación física automática.';
comment on table public.saas_data_audit_events is 'Auditoría de gobierno con metadatos mínimos y sanitizados.';
