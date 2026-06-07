-- Tillat kommune_admin å lese audit_logs der raden gjelder en saksbehandler/kommune-admin
-- (tidligere policy tillot kun «ikke-kommune»-profiler, så tom historikk ved visning av kollega-profil.)

drop policy if exists "Kommune admin can view staff audit history" on public.audit_logs;

create policy "Kommune admin can view staff audit history"
  on public.audit_logs for select
  using (
    public.is_kommune_admin()
    and exists (
      select 1 from public.profiles p
      where p.id = audit_logs.user_id
      and p.role in ('kommune_ansatt', 'kommune_admin')
    )
    and public.regions_overlap(
      public.current_user_kommune_regions(),
      public.parse_kommune_regions_sql(
        (select kommune_region from public.profiles where id = audit_logs.user_id)
      )
    )
  );
