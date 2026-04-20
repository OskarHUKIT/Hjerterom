-- Defensive: only return a terms row for signing if it is approved for landlord BankID signing.
-- doc_id from get_first_missing_terms_document_id_for_user should already be approved; this blocks edge cases.

create or replace function public.get_terms_document_for_signing(p_user_id uuid, p_city text default null)
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
  v_city text;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;
  v_city := nullif(trim(coalesce(p_city, '')), '');
  doc_id := public.get_first_missing_terms_document_id_for_user(p_user_id, v_city);
  if doc_id is null then
    return;
  end if;
  return query
  select td.id, td.title, td.body, td.version, td.pdf_bucket, td.pdf_storage_path
  from public.terms_documents td
  where td.id = doc_id
    and td.approved_for_utleier_signing = true;
end;
$$;

grant execute on function public.get_terms_document_for_signing(uuid, text) to authenticated;
