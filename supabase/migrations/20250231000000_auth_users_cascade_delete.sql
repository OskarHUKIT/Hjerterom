-- Fix: Allow deleting users from Supabase Dashboard
-- Tables referencing auth.users need ON DELETE CASCADE so user deletion works
-- Run this in SQL Editor if migrations haven't been applied

-- 1. profiles (main blocker - id references auth.users)
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles add constraint profiles_id_fkey 
  foreign key (id) references auth.users(id) on delete cascade;

-- 2. listings (owner_id references auth.users)
alter table listings drop constraint if exists listings_owner_id_fkey;
alter table listings add constraint listings_owner_id_fkey 
  foreign key (owner_id) references auth.users(id) on delete cascade;

-- 3. user_agreements
alter table user_agreements drop constraint if exists user_agreements_user_id_fkey;
alter table user_agreements add constraint user_agreements_user_id_fkey 
  foreign key (user_id) references auth.users(id) on delete cascade;

-- 4. audit_logs
alter table audit_logs drop constraint if exists audit_logs_user_id_fkey;
alter table audit_logs add constraint audit_logs_user_id_fkey 
  foreign key (user_id) references auth.users(id) on delete cascade;
