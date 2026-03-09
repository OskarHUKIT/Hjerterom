drop policy if exists "Kommune can view non-kommune user history" on audit_logs;
create policy "Kommune can view non-kommune user history" on audit_logs for select using (
  public.is_kommune_ansatt()
  and exists (
    select 1 from profiles p
    where p.id = audit_logs.user_id
    and (p.role is null or p.role != 'kommune_ansatt')
  )
);
