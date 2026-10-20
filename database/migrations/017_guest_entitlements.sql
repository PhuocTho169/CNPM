-- 17: guest sessions, entitlements trigger, payments, webhooks
--
-- Completes the guest + entitlement + payment infrastructure started in 016.
-- 016 already created: access_packages (+ seed), language_package_languages,
--   guest_sessions, language_entitlements, payment_transactions,
--   language_entitlement_audit, payment_webhook_events.
-- This migration is safe to run on a DB where 016 has already applied:
-- every CREATE is guarded by IF NOT EXISTS, and the only addition is the
-- exclusivity trigger on language_entitlements (which 016 does not create).
-- On a fresh DB where 016 has NOT run, this migration still creates every
-- table it needs (IF NOT EXISTS) so it can stand alone.

-- ---------------------------------------------------------------- guest sessions (if not already created by 016)
CREATE TABLE IF NOT EXISTS guest_sessions (
    id VARCHAR(64) PRIMARY KEY,
    token_hash VARCHAR(96) NOT NULL,
    display_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_display_id ON guest_sessions(display_id);

ALTER TABLE guest_sessions
    ADD COLUMN IF NOT EXISTS free_language_id INT REFERENCES languages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days');

CREATE INDEX IF NOT EXISTS idx_guest_free_lang ON guest_sessions(free_language_id);

-- ---------------------------------------------------------------- entitlements (if not already created by 016)
CREATE TABLE IF NOT EXISTS language_entitlements (
    id SERIAL PRIMARY KEY,
    guest_session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    access_type VARCHAR(16) NOT NULL
        CHECK (access_type IN ('free', 'purchased', 'available')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (guest_session_id, language_id)
);

-- ---------------------------------------------------------------- packages: language_package_languages (if not already created by 016)
CREATE TABLE IF NOT EXISTS language_package_languages (
    package_id INT NOT NULL REFERENCES access_packages(id) ON DELETE CASCADE,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    PRIMARY KEY (package_id, language_id)
);
CREATE INDEX IF NOT EXISTS idx_pkg_lang ON language_package_languages(language_id);

-- ---------------------------------------------------------------- payments (if not already created by 016)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    provider_transaction_id VARCHAR(128) NOT NULL,
    guest_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    package_id INT NOT NULL REFERENCES access_packages(id) ON DELETE RESTRICT,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    amount NUMERIC(14, 2) NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('pending', 'success', 'failed', 'canceled', 'expired')),
    provider_response TEXT,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    UNIQUE (provider_transaction_id)
);

DO $$ BEGIN
  ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS chk_payment_amount_non_negative;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE payment_transactions ADD CONSTRAINT chk_payment_amount_non_negative
    CHECK (amount >= 0) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_payment_guest ON payment_transactions(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_created ON payment_transactions(created_at);

-- Audit record of the entitlement decision.
CREATE TABLE IF NOT EXISTS language_entitlement_audit (
    id SERIAL PRIMARY KEY,
    guest_session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    package_id INT NOT NULL REFERENCES access_packages(id) ON DELETE RESTRICT,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL,
    provider_transaction_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_session
    ON language_entitlement_audit(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_user
    ON language_entitlement_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_status
    ON language_entitlement_audit(status);

-- Deterministic replay guard for payment webhooks.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    provider_event_id VARCHAR(128) NOT NULL,
    guest_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE CASCADE,
    payment_id INT NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('received', 'verified', 'duplicate', 'failed')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    UNIQUE (provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_event_processed
    ON payment_webhook_events(provider, provider_event_id) WHERE processed_at IS NOT NULL;

-- ---------------------------------------------------------------- exclusivity trigger (the one thing 016 does NOT create)
-- A (guest, language) pair must not hold both an 'available' row and a
-- free/purchased row. 016 relies solely on the app layer (atomic INSERT ...
-- ON CONFLICT DO UPDATE); this trigger adds a DB-level safety net.

CREATE OR REPLACE FUNCTION f_check_ent_available_exclusive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_type = 'available' THEN
    PERFORM 1
    FROM language_entitlements le
    WHERE le.guest_session_id = NEW.guest_session_id
      AND le.language_id = NEW.language_id
      AND le.id <> NEW.id
      AND le.access_type IN ('free', 'purchased');
    IF FOUND THEN
      RAISE EXCEPTION 'guest_language_exclusivity_violation: a (guest, language) pair cannot hold both available and free/purchased rows.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chk_ent_available_exclusive ON language_entitlements;
CREATE CONSTRAINT TRIGGER chk_ent_available_exclusive
AFTER INSERT OR UPDATE OF access_type ON language_entitlements
FOR EACH ROW
EXECUTE FUNCTION f_check_ent_available_exclusive();

COMMENT ON FUNCTION f_check_ent_available_exclusive IS 'Enforces that a (guest, language) pair does not hold both available and free/purchased rows.';
