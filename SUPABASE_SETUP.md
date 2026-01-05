# Supabase Integration for Bo.ly

This guide explains how to connect Bo.ly to Supabase for data storage.

## 1. Create Supabase Project

1.  Go to [supabase.com](https://supabase.com/) and create a new project.
2.  Once created, go to **Project Settings** -> **API** to find your `URL` and `anon public` key.

## 2. Database Schema

Run the following SQL in the Supabase **SQL Editor** to create the necessary tables:

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
  type text default 'Short-term',
  image_url text
);

-- Set up Row Level Security (RLS)
alter table listings enable row level security;

-- Policy: Anyone can view available listings (for NAV workers)
create policy "Anyone can view available listings" 
  on listings for select 
  using (is_available = true);

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


