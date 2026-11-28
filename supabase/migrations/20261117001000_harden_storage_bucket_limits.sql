-- Enforce server-side limits for sensitive invoice uploads.
-- RLS policies remain the tenant boundary; bucket settings add content controls.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']::text[]
where id = 'treasury-invoices';

update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']::text[]
where id = 'worker-photos';
