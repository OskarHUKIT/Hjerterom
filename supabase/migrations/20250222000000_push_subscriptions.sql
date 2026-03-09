-- Tabell for Web Push-abonnementer (PWA-varsler på mobil)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(owner_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "Users can manage own push subscriptions" on push_subscriptions;
create policy "Users can manage own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = owner_id);
