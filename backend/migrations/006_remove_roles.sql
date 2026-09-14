-- Migration 006: Eliminate roles distinction, all users are standard users
UPDATE users SET role = 'USER';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';
