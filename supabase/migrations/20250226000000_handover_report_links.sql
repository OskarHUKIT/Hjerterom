-- 1. Table for tenant report tokens (one per listing, generated when formidlet)
create table if not exists listing_tenant_tokens (
  listing_id uuid primary key references listings(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  created_at timestamp with time zone default now() not null
);

alter table listing_tenant_tokens enable row level security;

-- Kommune can manage (select to show link, insert to create)
create policy "Kommune can manage tenant tokens" on listing_tenant_tokens for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'kommune_ansatt')
);

-- 2. RPC for tenant to submit handover report (anon can call with valid token)
create or replace function public.submit_tenant_handover_report(p_token uuid, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_report_id uuid;
begin
  select listing_id into v_listing_id from listing_tenant_tokens where token = p_token;
  if v_listing_id is null then
    raise exception 'Ugyldig eller utløpt lenke.';
  end if;

  insert into handover_reports (listing_id, reporter_type, content, is_finalized, signed_at)
  values (v_listing_id, 'tenant', p_content, true, now())
  returning id into v_report_id;

  -- Notify all kommune users
  insert into notifications (owner_id, listing_id, type, title, message, status)
  select p.id, v_listing_id, 'NEW_REPORT', 'Ny overtakelsesrapport (Leietaker)',
    'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(p_content->>'address', '') || '.', 'unread'
  from profiles p where p.role = 'kommune_ansatt';

  return v_report_id;
end;
$$;

-- 3. RPC for anon to fetch listing info by token (for the form)
create or replace function public.get_listing_by_tenant_token(p_token uuid)
returns table(listing_id uuid, address text, owner_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select l.id, l.address, l.owner_name
  from listings l
  join listing_tenant_tokens t on t.listing_id = l.id
  where t.token = p_token;
end;
$$;

-- 4. RPC for homeowner to notify kommune when submitting report
create or replace function public.notify_kommune_new_report(p_listing_id uuid, p_address text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (owner_id, listing_id, type, title, message, status)
  select id, p_listing_id, 'NEW_REPORT', 'Ny overtakelsesrapport (Utleier)', 'En ny overtakelsesrapport er sendt inn for boligen på ' || p_address || '.', 'unread'
  from profiles where role = 'kommune_ansatt';
end;
$$;

-- 5. Allow owners to insert handover reports for their own listings
drop policy if exists "Users can view reports for their own listings" on handover_reports;
create policy "Users can view reports for their own listings" on handover_reports for select using (
  exists (select 1 from listings where id = listing_id and owner_id = auth.uid())
);
create policy "Owners can insert reports for own listings" on handover_reports for insert with check (
  exists (select 1 from listings where id = listing_id and owner_id = auth.uid())
);
