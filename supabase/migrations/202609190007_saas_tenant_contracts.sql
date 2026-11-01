-- Fase 10: contratos comerciales vinculados a empresas SaaS.
-- Sólo agrega una tabla de enlaces; no modifica roles, memberships ni datos operativos.

create table if not exists public.saas_tenant_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 200),
  contract_url text not null check (contract_url ~* '^https?://'),
  status text not null default 'active' check (status in ('draft','active','expired','cancelled')),
  counterparty_name text,
  counterparty_rut text,
  signed_at date,
  expires_at date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_tenant_contracts_tenant_status
  on public.saas_tenant_contracts(tenant_id, status, expires_at);

alter table public.saas_tenant_contracts enable row level security;
drop policy if exists saas_tenant_contracts_platform_owner on public.saas_tenant_contracts;
create policy saas_tenant_contracts_platform_owner
  on public.saas_tenant_contracts
  for all to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create or replace function public.touch_saas_tenant_contract_updated_at()
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

drop trigger if exists trg_saas_tenant_contracts_updated_at on public.saas_tenant_contracts;
create trigger trg_saas_tenant_contracts_updated_at
before update on public.saas_tenant_contracts
for each row execute function public.touch_saas_tenant_contract_updated_at();

comment on table public.saas_tenant_contracts is
  'Enlaces de contratos comerciales administrados por el dueño de la plataforma SaaS.';
