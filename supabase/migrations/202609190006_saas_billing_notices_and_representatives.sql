-- Fase 8: cartera SaaS y avisos de cobro.
-- Sólo agrega columnas/tablas; no modifica roles, memberships ni datos operativos de tenants.

alter table public.saas_customer_accounts
  add column if not exists company_rut text,
  add column if not exists legal_representative_name text,
  add column if not exists legal_representative_rut text,
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_address text,
  add column if not exists payment_day smallint;

create table if not exists public.saas_billing_notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid references public.saas_customer_accounts(id) on delete set null,
  folio text not null unique,
  period_start date not null,
  period_end date not null,
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'pending' check (status in ('draft','pending','paid','overdue','cancelled')),
  description text not null default 'Servicio SaaS y soporte mensual',
  net_amount numeric(14,2) not null default 0 check (net_amount >= 0),
  tax_rate numeric(6,4) not null default 0.19 check (tax_rate >= 0 and tax_rate <= 1),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  recipient_name text,
  recipient_rut text,
  recipient_email text,
  notes text,
  pdf_generated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_billing_notices_period_valid check (period_end >= period_start)
);

create index if not exists idx_saas_billing_notices_tenant_due
  on public.saas_billing_notices(tenant_id, due_date desc);
create index if not exists idx_saas_billing_notices_status_due
  on public.saas_billing_notices(status, due_date);

alter table public.saas_billing_notices enable row level security;
drop policy if exists saas_billing_notices_platform_owner on public.saas_billing_notices;
create policy saas_billing_notices_platform_owner
  on public.saas_billing_notices
  for all to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create or replace function public.touch_saas_billing_notice_updated_at()
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

drop trigger if exists trg_saas_billing_notices_updated_at on public.saas_billing_notices;
create trigger trg_saas_billing_notices_updated_at
before update on public.saas_billing_notices
for each row execute function public.touch_saas_billing_notice_updated_at();

comment on table public.saas_billing_notices is
  'Avisos de cobro internos del SaaS; no representan por sí solos un DTE o factura electrónica válida.';
comment on column public.saas_billing_notices.metadata is
  'Snapshot de datos de facturación usados para generar el PDF, sin alterar la fuente maestra.';
