-- Godkjenning av overtakelsesrapporter (kommune)
alter table handover_reports
  add column if not exists approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists request_change_comment text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

comment on column handover_reports.approval_status is 'pending | approved | rejected (ikke godkjent)';
