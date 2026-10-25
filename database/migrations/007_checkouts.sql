-- 007: Checkouts — the pay-to-unlock transaction log behind the QR paywall.
--
-- Flow: a guest scans a QR (mobile dish detail) and picks exactly one free
-- language. Every other language must be unlocked through a checkout: a row is
-- created 'pending', the provider confirms it to 'success', and the entitlement
-- (guest_sessions.purchased_languages) is granted in the same UPDATE path.
-- The table exists so the unlock always has a traceable receipt — even when the
-- provider is the sandbox confirm endpoint.
--
--   status:
--     pending → the guest started but never completed payment
--     success → entitlement granted (paid_at set)
--     failed  → provider rejected the payment

CREATE TABLE IF NOT EXISTS checkouts (
  id SERIAL PRIMARY KEY,
  guest_session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
  amount INT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  provider VARCHAR(30) NOT NULL DEFAULT 'SANDBOX',
  provider_transaction_id VARCHAR(100) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  paid_at TIMESTAMPTZ,
  idempotency_key VARCHAR(120) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_checkouts_updated ON checkouts;
CREATE TRIGGER trg_checkouts_updated BEFORE UPDATE ON checkouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_checkouts_guest
  ON checkouts(guest_session_id, status);
CREATE INDEX IF NOT EXISTS idx_checkouts_language
  ON checkouts(language_id, status);

-- A successful unlock is permanent per (guest, language): a duplicate webhook or
-- double-confirm can never shoulder two receipts for the same purchase.
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkouts_success_pair
  ON checkouts(guest_session_id, language_id) WHERE status = 'success';
