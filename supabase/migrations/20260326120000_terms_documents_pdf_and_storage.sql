-- Vilkår som PDF: lagring i Storage + nullable body; oppdatert RPC for signering/UI.

alter table public.terms_documents
  add column if not exists pdf_bucket text not null default 'documents';

alter table public.terms_documents
  add column if not exists pdf_storage_path text;

alter table public.terms_documents
  alter column body drop not null;

alter table public.terms_documents drop constraint if exists terms_documents_content_check;

alter table public.terms_documents add constraint terms_documents_content_check check (
  (pdf_storage_path is not null and length(trim(pdf_storage_path)) > 0)
  or (body is not null and length(trim(body)) > 0)
);

comment on column public.terms_documents.pdf_bucket is 'Supabase Storage bucket (typisk documents).';
comment on column public.terms_documents.pdf_storage_path is 'Objektsti i bucket, f.eks. terms/global/v2_<uuid>.pdf. Må være offentlig lesbar for BankID/signering.';

-- Samme tilgangslogikk som DB-insert: kommune-staff med redigering eller kommune_admin.
create or replace function public.kommune_can_upload_terms_pdf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kommune_can_publish_terms(null::text);
$$;

grant execute on function public.kommune_can_upload_terms_pdf() to authenticated;

-- Bucket documents (ofte opprettet manuelt i Supabase)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Terms PDFs: kommune upload" on storage.objects;
create policy "Terms PDFs: kommune upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and name like 'terms/%'
    and public.kommune_can_upload_terms_pdf()
  );

drop policy if exists "Public read terms PDFs" on storage.objects;
create policy "Public read terms PDFs"
  on storage.objects for select
  using (bucket_id = 'documents' and name like 'terms/%');

drop policy if exists "Kommune delete own terms PDFs" on storage.objects;
create policy "Kommune delete own terms PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and name like 'terms/%'
    and public.kommune_can_upload_terms_pdf()
  );

-- Postgres tillater ikke CREATE OR REPLACE når RETURNS TABLE endres — dropp først.
drop function if exists public.get_terms_document_for_signing(uuid);

create function public.get_terms_document_for_signing(p_user_id uuid)
returns table (
  id uuid,
  title text,
  body text,
  version int,
  pdf_bucket text,
  pdf_storage_path text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  doc_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;
  doc_id := public.get_latest_terms_document_id_for_user(p_user_id);
  if doc_id is null then
    return;
  end if;
  return query
  select td.id, td.title, td.body, td.version, td.pdf_bucket, td.pdf_storage_path
  from public.terms_documents td
  where td.id = doc_id;
end;
$$;

grant execute on function public.get_terms_document_for_signing(uuid) to authenticated;
