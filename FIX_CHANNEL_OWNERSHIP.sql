-- ================================================================
-- FIX CHANNEL OWNERSHIP - Run this in Supabase SQL Editor
-- ================================================================
-- This script transfers admin channels to the admin account
-- and ensures test channels stay with the test account
-- ================================================================

-- Step 1: View current channel ownership
SELECT
  c.id,
  c.name as channel_name,
  u.email as owner_email,
  u.role as owner_role
FROM "Channel" c
JOIN "User" u ON c."userId" = u.id
ORDER BY c.name;

-- Step 2: Transfer admin channels to admin account
-- Replace 'konrad.schrein@gmail.com' with your actual admin email if different
UPDATE "Channel"
SET "userId" = (
  SELECT id FROM "User" WHERE email = 'konrad.schrein@gmail.com' LIMIT 1
)
WHERE LOWER(name) IN (
  'peter''s help',
  'peters help',
  'harry',
  'gary''s guides',
  'garys guides'
);

-- Step 3: Ensure test channels are owned by test account
UPDATE "Channel"
SET "userId" = (
  SELECT id FROM "User" WHERE email = 'test@test.ai' LIMIT 1
)
WHERE LOWER(name) IN ('test', 'test2');

-- Step 4: Verify the fix
SELECT
  c.id,
  c.name as channel_name,
  u.email as owner_email,
  u.role as owner_role
FROM "Channel" c
JOIN "User" u ON c."userId" = u.id
ORDER BY u.email, c.name;

-- Expected result:
-- konrad.schrein@gmail.com (ADMIN) should own: Peter's Help, Harry, Gary's Guides
-- test@test.ai (USER) should own: test, test2
