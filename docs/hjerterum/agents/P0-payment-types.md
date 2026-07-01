# Agent brief — P0: Payment auth + server Supabase helper

## Objective

Fix checkout API routes that query `bookings` with an unauthenticated anon client (RLS blocks reads). Add shared server-side Supabase helper.

## Context to read (5 min)

- `frontend/app/api/stripe/checkout/route.ts`
- `frontend/app/api/vipps/checkout/route.ts`
- `frontend/app/api/stripe/connect/route.ts` (good pattern: returns `{ supabase, userId }`)
- `supabase/migrations/20260630200000_hjerterum_production_ready.sql` — `prepare_booking_payment` is **landlord-only**, not for guest checkout

## In scope

| File | Action |
|------|--------|
| `frontend/app/lib/supabaseServer.ts` | **Create** — `createAuthedServerClient()` → `{ supabase, userId, email }` |
| `frontend/app/api/stripe/checkout/route.ts` | Use authed client for `.from('bookings')` |
| `frontend/app/api/vipps/checkout/route.ts` | Use authed client for read + update |
| `frontend/package.json` | Add `"gen:types": "echo 'Run: supabase gen types typescript --local > frontend/lib/supabase/database.types.ts'"` |
| `frontend/lib/supabase/README.md` | **Create** — document type generation CI step |

## Out of scope

- Generated `database.types.ts` content (requires local Supabase)
- Stripe webhook dedupe
- `prepare_booking_payment` changes

## Implementation notes

```typescript
// supabaseServer.ts
export async function createAuthedServerClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, { cookies: { getAll, setAll: () => {} } })
  const { data } = await supabase.auth.getUser()
  return { supabase, userId: data.user?.id ?? null, email: data.user?.email ?? null }
}
```

Checkout routes: replace `createClient(url, key, { auth: { persistSession: false }})` with authed client from helper.

## Acceptance criteria

- [ ] Guest with valid session can load booking row in checkout (RLS passes via JWT)
- [ ] Vipps `bookings.update` uses same authed client
- [ ] `npm run build` passes
- [ ] No behavior change to Stripe/Vipps redirect URLs

## Commit

`fix(p0): use session-aware Supabase client in payment checkout routes`
