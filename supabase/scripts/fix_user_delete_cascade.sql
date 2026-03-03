-- =============================================================================
-- Fix: "Failed to delete user: Database error deleting user"
-- Run this in Supabase Dashboard → SQL Editor
-- Adds ON DELETE CASCADE to all tables referencing auth.users
-- =============================================================================

-- If a statement fails (e.g. "constraint does not exist"), run this to find actual names:
-- SELECT c.conname, c.conrelid::regclass as table_name
-- FROM pg_constraint c
-- JOIN pg_namespace n ON n.oid = c.connamespace
-- WHERE c.confrelid = 'auth.users'::regclass AND c.contype = 'f';

-- 1. profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. listings
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_owner_id_fkey;
ALTER TABLE listings ADD CONSTRAINT listings_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. user_agreements
ALTER TABLE user_agreements DROP CONSTRAINT IF EXISTS user_agreements_user_id_fkey;
ALTER TABLE user_agreements ADD CONSTRAINT user_agreements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. chat_messages (sender_id, receiver_id)
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_receiver_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. notifications (owner_id, resolved_by)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_owner_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_resolved_by_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. internal_notes
ALTER TABLE internal_notes DROP CONSTRAINT IF EXISTS internal_notes_owner_id_fkey;
ALTER TABLE internal_notes ADD CONSTRAINT internal_notes_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE internal_notes DROP CONSTRAINT IF EXISTS internal_notes_created_by_fkey;
ALTER TABLE internal_notes ADD CONSTRAINT internal_notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. nav_notes
ALTER TABLE nav_notes DROP CONSTRAINT IF EXISTS nav_notes_owner_id_fkey;
ALTER TABLE nav_notes ADD CONSTRAINT nav_notes_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE nav_notes DROP CONSTRAINT IF EXISTS nav_notes_created_by_fkey;
ALTER TABLE nav_notes ADD CONSTRAINT nav_notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. push_subscriptions (likely already has CASCADE, but ensure)
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_owner_id_fkey;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
