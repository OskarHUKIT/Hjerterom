# Creating test accounts (utleier + kommunebruker)

After running the cleanup script, create two test accounts:

## 1. Utleier (landlord) test account

1. Go to **https://[your-app-url]/login**
2. Click **Registrer deg** (Sign up)
3. Fill in:
   - Full name: `Test Utleier`
   - Phone: `123 45 678`
   - Email: `utleier@test.boly.no` (or your test email)
   - Password: choose a secure password
4. Click **Opprett konto**
5. Confirm email (check inbox or Supabase Dashboard → Authentication → Users)
6. Log in and sign the terms at `/homeowner/sign-terms`
7. Add test listings at `/homeowner/manage`

## 2. Kommunebruker (municipality) test account

Kommune accounts require the `role` to be set to `kommune_ansatt` in the database.

### Option A: Via Supabase Dashboard (recommended)

1. Create account as usual at `/login` (Sign up)
   - Email: `kommune@test.boly.no`
   - Password: choose a secure password
2. Go to **Supabase Dashboard** → **Authentication** → **Users**
3. Find the new user, click the three dots → **Edit user**
4. Under **User Metadata**, add or edit: `{"role": "kommune_ansatt"}`
5. Save
6. Go to **Table Editor** → **profiles**
7. Find the row for this user (`id` matches auth user)
8. Set `role` = `kommune_ansatt`
9. Log in – you will see the kommune nav (Boligbanken, Brukere, Meldinger, Utløpte)

### Option B: Via SQL (after signup)

```sql
-- Replace EMAIL and USER_ID with the new user's email/id
UPDATE profiles 
SET role = 'kommune_ansatt' 
WHERE email = 'kommune@test.boly.no';

-- Also update auth metadata (requires service role or dashboard)
-- In Dashboard: Authentication → Users → Edit → User Metadata → {"role": "kommune_ansatt"}
```

## Cleanup command (reminder)

Run `supabase/scripts/cleanup_for_testing.sql` in Supabase SQL Editor, then delete all users in Authentication → Users.
