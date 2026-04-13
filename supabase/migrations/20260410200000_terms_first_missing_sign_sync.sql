-- Vilkår: signér kun det som mangler (grunn før region per by). BankID-sync bruker faktisk dokument-ID fra SIGN_INITIATED.

create or replace function public.get_first_missing_terms_document_id_for_user(
  p_user_id uuid,
  p_city text default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  req uuid[];
  tid uuid;
  v_city text;
begin
  v_city := nullif(trim(coalesce(p_city, '')), '');
  req := public.get_required_terms_document_ids_for_city(v_city);
  if req is null or coalesce(array_length(req, 1), 0) = 0 then
    return null;
  end if;
  foreach tid in array req loop
    if not exists (
      select 1
      from public.user_terms_acceptances u
      where u.user_id = p_user_id
        and u.terms_document_id = tid
        and u.status = 'active'
    ) then
      return tid;
    end if;
  end loop;
  return null;
end;
$$;

comment on function public.get_first_missing_terms_document_id_for_user(uuid, text) is
  'Første dokument-ID fra get_required_terms_document_ids_for_city (grunn, deretter region) som brukeren ikke har aktiv aksept for.';

grant execute on function public.get_first_missing_terms_document_id_for_user(uuid, text) to authenticated;
grant execute on function public.get_first_missing_terms_document_id_for_user(uuid, text) to service_role;

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
  where td.id = doc_id;
end;
$$;

drop function if exists public.sync_terms_acceptance_after_sign(uuid, text);

create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid, p_terms_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid := p_terms_document_id;
  reg_new text;
begin
  if tid is null then
    return;
  end if;
  if not exists (select 1 from public.terms_documents where id = tid) then
    return;
  end if;

  select nullif(trim(coalesce(kommune_region, '')), '') into reg_new
  from public.terms_documents
  where id = tid;

  update public.user_terms_acceptances uta
  set status = 'superseded'
  from public.terms_documents td_old
  where uta.user_id = p_user_id
    and uta.status = 'active'
    and uta.terms_document_id = td_old.id
    and uta.terms_document_id is distinct from tid
    and (
      (reg_new is null and (td_old.kommune_region is null or trim(td_old.kommune_region) = ''))
      or
      (
        reg_new is not null
        and td_old.kommune_region is not null
        and public.same_kommune_region_bucket(reg_new, td_old.kommune_region)
      )
    );

  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;

comment on function public.sync_terms_acceptance_after_sign(uuid, uuid) is
  'Oppdaterer user_terms_acceptances for det dokumentet brukeren faktisk signerte (etter BankID).';

grant execute on function public.sync_terms_acceptance_after_sign(uuid, uuid) to service_role;

grant execute on function public.get_terms_document_for_signing(uuid, text) to authenticated;
