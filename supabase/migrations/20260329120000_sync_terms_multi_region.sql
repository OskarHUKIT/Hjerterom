-- Behold aktive vilkår for andre regioner når bruker signerer for én kommune.
-- Supersedes kun eldre dokumenter i samme «region-bøtte» (global vs samme kommune_region).

create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid, p_city text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  reg_new text;
begin
  tid := public.get_latest_terms_document_id_for_user(p_user_id, p_city);
  if tid is null then
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
        and lower(trim(td_old.kommune_region)) = lower(reg_new)
      )
    );

  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;

grant execute on function public.sync_terms_acceptance_after_sign(uuid, text) to service_role;
