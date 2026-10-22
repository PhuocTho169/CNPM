-- 018: Public visitor role — accounts created by the public sign-up page.
-- Idempotent: safe to re-run (skipped when the role already exists).
INSERT INTO roles (code, name, description)
VALUES ('VISITOR', 'Visitor', 'Public visitor who signs up from the website; no admin permissions')
ON CONFLICT (code) DO NOTHING;
