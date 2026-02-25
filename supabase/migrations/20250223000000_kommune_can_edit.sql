-- Two access levels for kommune-ansatte: view-only vs edit
-- kommune_can_edit = true (default) → full edit access
-- kommune_can_edit = false → view-only (cannot mark formidlet, extend, remove, etc.)
alter table profiles add column if not exists kommune_can_edit boolean default true;
