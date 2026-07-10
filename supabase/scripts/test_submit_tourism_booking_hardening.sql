-- Verification for migration 20260710120000_harden_submit_tourism_booking.
-- Run in Supabase SQL Editor (or psql) with service role after the migration is applied.
--
-- Part 1 is self-contained SQL (no auth context needed) and can just be run as-is: it will
-- RAISE EXCEPTION if any check regresses.
--
-- Part 2 exercises submit_tourism_booking itself, which reads auth.uid()/auth.users, so it
-- needs a real authenticated session (Supabase SQL Editor "Run as" a user, or a PostgREST
-- call with a guest JWT). Snippets are commented; fill in a real listing id + user before
-- running.

-- ─── Part 1: assert_tourism_booking_available (pure SQL, runnable now) ───
do $$
declare
  v_listing_id uuid;
  v_result jsonb;
begin
  select id into v_listing_id from public.listings where tourism_enabled = true limit 1;

  if v_listing_id is null then
    raise notice 'No tourism-enabled listing found — skipping assert_tourism_booking_available checks.';
  else
    -- check_out <= check_in must be rejected
    v_result := public.assert_tourism_booking_available(v_listing_id, current_date + 5, current_date + 5);
    if (v_result->>'error') is distinct from 'invalid_dates' then
      raise exception 'FAIL: check_out = check_in should return invalid_dates, got %', v_result;
    end if;
    raise notice 'PASS: check_out = check_in rejected (%)', v_result;

    v_result := public.assert_tourism_booking_available(v_listing_id, current_date + 5, current_date + 2);
    if (v_result->>'error') is distinct from 'invalid_dates' then
      raise exception 'FAIL: check_out < check_in should return invalid_dates, got %', v_result;
    end if;
    raise notice 'PASS: check_out < check_in rejected (%)', v_result;

    -- check_in in the past must be rejected
    v_result := public.assert_tourism_booking_available(v_listing_id, current_date - 3, current_date + 2);
    if (v_result->>'error') is distinct from 'invalid_dates' then
      raise exception 'FAIL: past check_in should return invalid_dates, got %', v_result;
    end if;
    raise notice 'PASS: past check_in rejected (%)', v_result;
  end if;

  -- Unknown / non-tourism listing must be rejected regardless of dates
  v_result := public.assert_tourism_booking_available(
    '00000000-0000-0000-0000-000000000000'::uuid, current_date + 1, current_date + 3
  );
  if (v_result->>'error') is distinct from 'listing_not_found' then
    raise exception 'FAIL: unknown listing should return listing_not_found, got %', v_result;
  end if;
  raise notice 'PASS: unknown listing rejected (%)', v_result;
end;
$$;

-- ─── Part 2: submit_tourism_booking (needs an authenticated session) ───
-- 1. Amount tampering is structurally impossible: the RPC has no p_amount/p_amount_cents
--    parameter, so there is nothing to send. Confirm the signature:
--    select pg_get_function_arguments(oid) from pg_proc where proname = 'submit_tourism_booking';
--    -> listing_id, guest_email, guest_name, check_in, check_out, guest_phone, message, event_id

-- 2. Past check-in via the RPC (run as an authenticated guest):
-- select public.submit_tourism_booking(
--   '<tourism_listing_id>'::uuid,
--   '<your-auth-email>',
--   'Past Date Test',
--   (current_date - 1)::date,
--   (current_date + 2)::date
-- );
-- Expect: {"ok": false, "error": "invalid_dates"}

-- 3. Terms not accepted (requires a listings row + an active turisme click-wrap
--    terms_documents row, and a guest user_id with no matching guest_terms_acceptances row):
-- select public.submit_tourism_booking(
--   '<tourism_listing_id>'::uuid,
--   '<your-auth-email>',
--   'Terms Test',
--   (current_date + 10)::date,
--   (current_date + 12)::date
-- );
-- Expect: {"ok": false, "error": "terms_not_accepted"}
-- After inserting a matching row into guest_terms_acceptances for that user + doc, re-run:
-- expect {"ok": true, ...}.

-- 4. Overlap now also blocks against 'completed' bookings:
-- update bookings set status = 'completed' where id = '<some_existing_booking_id>';
-- select public.submit_tourism_booking(
--   '<same_listing_id>'::uuid, '<your-auth-email>', 'Overlap Test',
--   '<check_in of the completed booking>'::date, '<check_out of the completed booking>'::date
-- );
-- Expect: {"ok": false, "error": "dates_conflict"}

-- 5. Cleanup test rows created above:
-- delete from bookings where guest_name in ('Past Date Test', 'Terms Test', 'Overlap Test');
