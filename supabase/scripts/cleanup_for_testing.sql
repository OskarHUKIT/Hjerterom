-- =============================================================================
-- BOLY: Cleanup script for testing period
-- Run this in Supabase Dashboard → SQL Editor to remove ALL user data
-- WARNING: This permanently deletes all listings, users, messages, etc.
-- =============================================================================

-- Disable triggers temporarily to avoid cascade issues during cleanup
SET session_replication_role = 'replica';

-- 1. Delete chat messages
DELETE FROM chat_messages;

-- 2. Delete notifications
DELETE FROM notifications;

-- 3. Delete internal notes (kommune)
DELETE FROM internal_notes;

-- 4. Delete nav notes (kommune)
DELETE FROM nav_notes;

-- 5. Delete audit logs
DELETE FROM audit_logs;

-- 6. Delete handover reports
DELETE FROM handover_reports;

-- 7. Delete listing tenant tokens
DELETE FROM listing_tenant_tokens;

-- 8. Delete listing availability (before listings, FK to listings)
DELETE FROM listing_availability;

-- 9. Delete user agreements
DELETE FROM user_agreements;

-- 10. Delete push subscriptions
DELETE FROM push_subscriptions;

-- 11. Delete listings
DELETE FROM listings;

-- 12. Delete profiles
DELETE FROM profiles;

-- 13. Delete kommune access whitelist (optional - keep if you want to preserve the list)
-- DELETE FROM kommune_access_list;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================================================
-- AFTER RUNNING THIS SCRIPT:
-- Delete auth users manually in Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Select all users and delete them
--
-- Or use Supabase Management API (service role key required):
-- DELETE https://[PROJECT_REF].supabase.co/auth/v1/admin/users
-- =============================================================================
