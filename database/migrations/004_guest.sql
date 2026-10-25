-- 005: Guest sessions — single-table paywall replacing guest_sessions +
-- language_entitlements + access_packages + language_package_languages +
-- payment_transactions + language_entitlement_audit + payment_webhook_events.
--
-- free_language_id     : the one language chosen free on first selection
-- purchased_languages  : INT[] of language ids unlocked by (sandbox) payments
-- expires_at           : session TTL, guest records expire together with it

CREATE TABLE IF NOT EXISTS guest_sessions (
  id VARCHAR(64) PRIMARY KEY,
  token_hash VARCHAR(96) NOT NULL,
  display_id VARCHAR(64) NOT NULL UNIQUE,
  free_language_id INT REFERENCES languages(id) ON DELETE SET NULL,
  purchased_languages INT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_guest_updated ON guest_sessions;
CREATE TRIGGER trg_guest_updated BEFORE UPDATE ON guest_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_guest_free_lang ON guest_sessions(free_language_id);
