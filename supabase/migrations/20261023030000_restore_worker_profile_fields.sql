-- Restore worker profile fields expected by the current UI after the v4 schema reset.
-- Bank details intentionally remain in worker_bank_accounts; account_type is not a workers column.
alter table public.workers
  add column if not exists nombres text,
  add column if not exists apellidos text,
  add column if not exists occupational_exam_exp_date date,
  add column if not exists driver_license_exp_date date,
  add column if not exists irl_signed_date date,
  add column if not exists contract_url text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists afp text,
  add column if not exists health_insurance text,
  add column if not exists nationality text,
  add column if not exists notes text,
  add column if not exists photo_url text,
  add column if not exists overtime_rate numeric default 0,
  add column if not exists meal_allowance numeric default 0,
  add column if not exists mobility_allowance numeric default 0,
  add column if not exists afp_rate numeric,
  add column if not exists health_rate numeric,
  add column if not exists bonus_target numeric,
  add column if not exists reports_to text;

comment on column public.workers.reports_to is 'Optional reporting relationship identifier; bank details are stored in worker_bank_accounts.';

alter table public.worker_bank_accounts
  add column if not exists bank_name text,
  add column if not exists account_type text,
  add column if not exists account_number text,
  add column if not exists holder_name text,
  add column if not exists holder_rut text,
  add column if not exists email_for_payments text,
  add column if not exists is_active boolean default true;

create unique index if not exists uq_worker_bank_accounts_worker_account
  on public.worker_bank_accounts(worker_rut, account_number);
