
-- Delete test auth users via their IDs
DELETE FROM auth.users WHERE email IN ('student@test.com', 'center@test.com', 'admin@test.com', 'superadmin@test.com', 'teststudent2@test.com', 'testcenter2@test.com', 'testcenter3@test.com');
