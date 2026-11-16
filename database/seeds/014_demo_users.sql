-- 014: DEVELOPMENT-ONLY demo accounts (admin@district4.local / staff@district4.local)
-- seed.js skips this file when NODE_ENV=production, so a production seed never
-- creates known-password logins. Passwords are documented in the dev login hint.
-- pgcrypto provides bcrypt-compatible password hashes usable by bcryptjs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password_hash, full_name, role)
VALUES ('admin@district4.local', crypt('Admin@123456', gen_salt('bf', 10)), 'System Administrator', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, full_name, role)
VALUES ('staff@district4.local', crypt('Staff@123456', gen_salt('bf', 10)), 'Content Staff', 'STAFF')
ON CONFLICT (email) DO NOTHING;
