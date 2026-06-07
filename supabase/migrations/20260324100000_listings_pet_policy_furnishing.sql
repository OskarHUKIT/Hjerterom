-- Husdyr: policy + valgfri utdyping. Møblering: ny standardtekst (erstatter gammel streng i data).
alter table public.listings
  add column if not exists pet_policy text default 'Ingen dyr tillatt',
  add column if not exists pet_policy_detail text;

comment on column public.listings.pet_policy is 'Tillatt | Ingen dyr tillatt | Enkelte dyr er tillatt';
comment on column public.listings.pet_policy_detail is 'Fritekst når pet_policy er Enkelte dyr er tillatt';

update public.listings
set furnishing = 'Fullt møblert og boligen har alt nødvendig inventar for matlaging og overnatting.'
where furnishing = 'Fullt møblert med inventar på kjøkken og bad';
