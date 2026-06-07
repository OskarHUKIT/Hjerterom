# Supabase-integrasjon for Boly

This guide explains how to connect Boly to Supabase for data storage and management.

## 1. Create Supabase Project

1.  Go to [supabase.com](https://supabase.com/) and create a new project.
2.  Once created, go to **Project Settings** -> **API** to find your `URL` and `anon public` key.

## 2. Initial Database Schema

Run the following SQL in the Supabase **SQL Editor** to create the base table:

```sql
-- Table for housing listings
create table listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references auth.users not null,
  address text not null,
  city text not null,
  price_per_night numeric not null,
  description text,
  is_available boolean default true,
  beds integer default 1,
  type text default 'Leilighet',
  image_url text
);

-- Set up Row Level Security (RLS)
alter table listings enable row level security;

-- Policy: Authenticated users (Kommune and owners) can view all listings
create policy "Authenticated users can view all listings" 
  on listings for select 
  using (auth.role() = 'authenticated');

-- Policy: Owners can manage their own listings
create policy "Owners can manage their own listings" 
  on listings for all 
  using (auth.uid() = owner_id);
```

## 3. Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 4. Install Dependencies

In the `frontend/` directory, run:
```bash
npm install @supabase/supabase-js
```

## 5. Usage in Code

The project is structured to use a Supabase client. You can find the configuration in `frontend/app/lib/supabase.ts`.

## 6. Storage Setup (Images)

To enable image uploads for housing listings, you need to create a storage bucket:

1.  Go to the **Storage** section in your Supabase dashboard.
2.  Click **New Bucket**.
3.  Name it `listings`.
4.  Make sure the bucket is **Public** (so Kommune workers can see the images).
5.  Click **Create Bucket**.
6.  **Add Policies** for the `listings` bucket:
    *   **Policy 1 (Select):** Allow **Anyone** to `SELECT` (view) files.
    *   **Policy 2 (Insert):** Allow **Authenticated Users** to `INSERT` (upload) files.
    *   **Policy 3 (Update/Delete):** Allow **Authenticated Users** to `UPDATE` or `DELETE` their own files.

## 7. Database updates (full funksjonalitet for Boly)

Run this SQL to add all the professional fields, user agreements, and history logging required for the full app. **This fixes the "could not find status column" error.**

```sql
-- 1. Update listings table with all required fields
alter table listings 
add column if not exists owner_name text,
add column if not exists postal_code text,
add column if not exists contact_phone text,
add column if not exists size_sqm numeric,
add column if not exists bedrooms integer,
add column if not exists floor_number text,
add column if not exists accessibility text[], 
add column if not exists floor_detail text[],    
add column if not exists furnishing text,
add column if not exists price_daily numeric,
add column if not exists price_weekly numeric,
add column if not exists price_monthly_short numeric,
add column if not exists price_monthly_long numeric,
add column if not exists includes text[],      
add column if not exists deposit_amount numeric,
add column if not exists deposit_guarantee text[], 
add column if not exists parking_info text,
add column if not exists max_occupants integer,
add column if not exists additional_info text,
add column if not exists last_verified timestamp with time zone default now(),
add column if not exists status text default 'Tilgjengelig', -- 'Tilgjengelig', 'Utilgjengelig', or 'Formidla'
add column if not exists image_urls text[]; -- Array of image URLs for gallery

-- 5. Table for listing availability periods
create table if not exists listing_availability (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  listing_id uuid references listings(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text default 'Tilgjengelig' -- 'Tilgjengelig', 'Utilgjengelig', or 'Formidla'
);

alter table listing_availability enable row level security;
create policy "Anyone can view availability" on listing_availability for select using (true);
create policy "Owners can manage availability" on listing_availability for all using (
  exists (select 1 from listings where id = listing_id and owner_id = auth.uid())
);
-- Kommune can add/remove Formidla periods - run supabase/migrations/20250213_kommune_listing_availability.sql if needed

-- 8. EXTENDED SCHEMA FOR KOMMUNE UPDATE
-- Run this to support new features: Handover reports, Notifications, Internal Notes, and Chats

-- Update listings status constraint
-- NOTE: Manual migration might be needed if you have existing data
-- alter table listings drop constraint if exists listings_status_check;
-- alter table listings add constraint listings_status_check check (status in ('Tilgjengelig', 'Utilgjengelig', 'Formidla'));

-- Table for Handover Reports (Overtakelsesrapporter)
create table if not exists handover_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  listing_id uuid references listings(id) on delete cascade,
  reporter_type text not null check (reporter_type in ('homeowner', 'tenant')),
  content jsonb not null, -- Flexible schema for report data
  is_finalized boolean default false,
  signed_at timestamp with time zone,
  anonymous_token uuid default gen_random_uuid() -- For tenant anonymous access
);

-- Table for Notifications (Delt varslingssystem)
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  listing_id uuid references listings(id) on delete cascade,
  owner_id uuid references auth.users on delete cascade,
  type text not null, -- 'NEW_MESSAGE', 'NEW_REPORT', 'TERMS_SIGNED', 'AGREEMENT_ENDED'
  title text not null,
  message text,
  status text default 'unread' check (status in ('unread', 'completed')),
  resolved_by uuid references auth.users,
  resolved_at timestamp with time zone,
  municipality text -- To filter by municipality
);

-- Table for Internal Notes (Kommune internal notes)
create table if not exists internal_notes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  listing_id uuid references listings(id) on delete cascade,
  owner_id uuid references auth.users on delete cascade,
  content text not null,
  created_by uuid references auth.users not null
);

-- Table for Chats/Messages
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  sender_id uuid references auth.users not null,
  receiver_id uuid, -- If null, it's sent to "Kommune" (all authorized workers)
  listing_id uuid references listings(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  municipality text -- To route to correct municipality
);

-- Update user_agreements for termination tracking
alter table profiles add column if not exists allowed_municipalities text[];
alter table profiles add column if not exists folkeregistrert_kommune text;

-- Enable RLS on new tables
alter table handover_reports enable row level security;
alter table notifications enable row level security;
alter table internal_notes enable row level security;
alter table chat_messages enable row level security;

-- Policies for Handover Reports
create policy "Users can view reports for their own listings" on handover_reports for select using (
  exists (select 1 from listings where id = listing_id and owner_id = auth.uid())
);
create policy "Kommune can view all reports" on handover_reports for select using (true);

-- Policies for Notifications (Kommune only)
create policy "Kommune can manage notifications" on notifications for all using (true);

-- Policies for Internal Notes (Kommune only)
create policy "Kommune can manage internal notes" on internal_notes for all using (true);

-- Policies for Chat
create policy "Users can see their own messages" on chat_messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id or receiver_id is null);
create policy "Users can send messages" on chat_messages for insert with check (auth.uid() = sender_id);
create policy "Kommune can see all messages" on chat_messages for select using (true);

-- 2. Table for user agreements (BankID signing)
create table if not exists user_agreements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  signed_at timestamp with time zone default now() not null,
  agreement_version text not null,
  is_terminated boolean default false,
  terminated_at timestamp with time zone,
  unique(user_id, agreement_version)
);

-- 3. Table for Kommune private notes
create table if not exists nav_notes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  listing_id uuid references listings(id) on delete cascade,
  owner_id uuid references auth.users on delete cascade,
  note_text text not null,
  created_by uuid references auth.users not null
);

-- 4. Table for audit logs / history
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid references auth.users not null,
  action_type text not null, 
  listing_id uuid,
  listing_address text,
  details jsonb
);

-- Enable RLS on new tables
alter table user_agreements enable row level security;
alter table nav_notes enable row level security;
alter table audit_logs enable row level security;

-- Policies for user_agreements
create policy "Users can view their own agreements" on user_agreements for select using (auth.uid() = user_id);
create policy "Users can sign their own agreements" on user_agreements for insert with check (auth.uid() = user_id);
create policy "Kommune can view all agreements" on user_agreements for select using (true); 

-- Policies for nav_notes (Kommune only)
create policy "Anyone can view notes" on nav_notes for select using (true); 
create policy "Anyone can create notes" on nav_notes for insert with check (true);

-- Policies for audit_logs
create policy "Users can view their own history" on audit_logs for select using (auth.uid() = user_id);
create policy "System can create logs" on audit_logs for insert with check (true);

-- Ensure storage bucket exists and has policies
insert into storage.buckets (id, name, public) values ('listings', 'listings', true) on conflict do nothing;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'listings' );
create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'listings' and auth.role() = 'authenticated' );
```

## Ekstra: Brukere og varsler (migration 20250219)

Kjør migrasjonen `supabase/migrations/20250219_profiles_kommune_notifications.sql` og `20250219200000_notification_sender_and_link.sql` for å:

1. **Brukere-listen** – Kommune kan se alle profiler (inkl. nye BankID-brukere)
2. **Varsler ved melding fra utleier** – Når en utleier sender melding til Kommune, får alle kommune-ansatte et varsel med avsendernavn i tittelen
3. **Gå til melding** – Kommune-ansatte kan klikke på meldingsvarslet for å åpne chatten med utleieren

Hvis `supabase db push` feiler pga. migrasjonskonflikt, kjør SQL-en i `20250219200000_notification_sender_and_link.sql` manuelt i Supabase Dashboard → SQL Editor.

## Nye brukere vises ikke i Brukere-listen

Kjør `20250220000000_kommune_list_all_users.sql` for å lage RPC-funksjonen `get_all_users_for_kommune()`. Den henter brukere fra `auth.users` (inkl. nye BankID-brukere) og slår sammen med `profiles`, og omgår RLS slik at Kommune får med alle.

## Overtakelsesrapport-påminnelse (cron)

Når en bolig er markert som formidlet og overtakelsen starter om 1 dag, sendes et hastende varsel til utleier hvis overtakelsesrapport mangler. Dette krever:

1. **Extensions**: Aktiver `pg_cron` og `pg_net` i Database → Extensions (hvis ikke allerede)
2. **Edge Function**: `remind-handover-report` – deploy med `supabase functions deploy remind-handover-report`
3. **Cron**: Migrasjonen `20250228000000_handover_reminder_cron.sql` setter opp daglig kjøring kl. 07:00 UTC (08:00 norsk tid vinter)

**Før migrasjonen kjører**, legg inn Vault-hemmeligheter i SQL Editor:

```sql
select vault.create_secret('https://DITT_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('DIN_ANON_ELLER_SERVICE_KEY', 'anon_key');
```

Erstatt med verdier fra Project Settings → API. For å teste manuelt: `curl -X POST "https://DITT_PROJECT_REF.supabase.co/functions/v1/remind-handover-report" -H "Authorization: Bearer DIN_KEY"`.
