-- Fase 11: onboarding profesional de nuevas empresas SaaS.
-- No almacena contraseñas, tokens ni secretos de autenticación.

create table if not exists public.saas_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete restrict,
  contact_name text,
  primary_email text,
  alternate_email text,
  access_path text,
  help_path text,
  manual_url text,
  support_email text,
  support_phone text,
  support_whatsapp text,
  support_hours text,
  support_url text,
  provider_legal_name text,
  provider_rut text,
  bank_name text,
  account_type text,
  account_number text,
  account_holder text,
  account_holder_rut text,
  billing_email text,
  billing_legal_notice text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_onboarding_primary_email_valid check (primary_email is null or primary_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint saas_onboarding_alternate_email_valid check (alternate_email is null or alternate_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create table if not exists public.saas_onboarding_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  recipient_name text,
  recipient_email text not null,
  subject text not null,
  status text not null default 'draft' check (status in ('draft','queued','sent','failed')),
  provider text,
  error_message text,
  sent_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  constraint saas_onboarding_delivery_email_valid check (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create index if not exists idx_saas_onboarding_deliveries_tenant_created
  on public.saas_onboarding_deliveries(tenant_id, created_at desc);
create index if not exists idx_saas_onboarding_deliveries_status
  on public.saas_onboarding_deliveries(status, created_at desc);

alter table public.saas_onboarding_profiles enable row level security;
alter table public.saas_onboarding_deliveries enable row level security;

drop policy if exists saas_onboarding_profiles_platform_owner on public.saas_onboarding_profiles;
create policy saas_onboarding_profiles_platform_owner
  on public.saas_onboarding_profiles
  for all to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

drop policy if exists saas_onboarding_deliveries_platform_owner on public.saas_onboarding_deliveries;
create policy saas_onboarding_deliveries_platform_owner
  on public.saas_onboarding_deliveries
  for all to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create or replace function public.touch_saas_onboarding_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saas_onboarding_profiles_updated_at on public.saas_onboarding_profiles;
create trigger trg_saas_onboarding_profiles_updated_at
before update on public.saas_onboarding_profiles
for each row execute function public.touch_saas_onboarding_profile_updated_at();

comment on table public.saas_onboarding_profiles is
  'Datos administrativos de bienvenida y facturación del proveedor SaaS; nunca contiene credenciales.';
comment on table public.saas_onboarding_deliveries is
  'Auditoría mínima de correos de onboarding; nunca contiene contraseñas ni tokens.';
