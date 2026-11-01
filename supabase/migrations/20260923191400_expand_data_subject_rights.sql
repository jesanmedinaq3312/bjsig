-- Derechos de titulares de datos personales.
-- Mantiene los tipos operativos existentes y agrega los derechos de la Ley 21.719.
alter table public.saas_data_requests
  drop constraint if exists saas_data_requests_request_type_check;

alter table public.saas_data_requests
  add constraint saas_data_requests_request_type_check
  check (request_type in (
    'access',
    'rectification',
    'suppression',
    'opposition',
    'portability',
    'blocking',
    'export',
    'archive',
    'deletion',
    'retention_review'
  ));

comment on column public.saas_data_requests.request_type is
  'Derecho o acción solicitada: access, rectification, suppression, opposition, portability, blocking, export, archive, deletion o retention_review.';
