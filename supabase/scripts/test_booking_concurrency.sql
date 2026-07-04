-- NPD-3D: Manual concurrency check for submit_tourism_booking row lock.
-- Run in Supabase SQL Editor with service role after migration 20260701220000.
--
-- Expected: second insert attempt returns dates_conflict when overlapping pending/accepted exists.

-- 1. Pick a tourism listing with availability (adjust UUID from demo seed):
-- select id, address from listings where tourism_enabled and tourism_instant_book limit 1;

-- 2. Simulate two bookings same dates (use submit_tourism_booking as authenticated guest or via service):
-- select public.submit_tourism_booking(
--   '<listing_id>'::uuid,
--   'test.concurrency@demo.ofoten.no',
--   'Concurrency Test',
--   '2026-08-01'::date,
--   '2026-08-05'::date
-- );

-- 3. Run again with same listing/dates before first is cancelled — expect:
-- {"ok": false, "error": "dates_conflict"}

-- 4. Cleanup:
-- delete from bookings where guest_email = 'test.concurrency@demo.ofoten.no';
