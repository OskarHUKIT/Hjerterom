-- Optional note when marking a period as Formidla; may be included in owner notification.
alter table listing_availability
  add column if not exists mediation_note text,
  add column if not exists include_note_in_owner_notification boolean not null default false;

comment on column listing_availability.mediation_note is 'Optional note from caseworker when marking mediation period.';
comment on column listing_availability.include_note_in_owner_notification is 'If true and note is set, note was appended to HOUSE_FORMIDLET notification to owner.';
