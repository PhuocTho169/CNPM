-- 016: multilingual narration language entitlements & payments
--
-- Adds the guest-session, language-entitlement, package, package-languages and
-- payment records required by the QR-based multilingual narration feature
-- (spec sections 4, 5, 6, 9, 12). All tables are schema-only and dependency
-- free; data seeds live in a separate file so re-runs of migrate.js never try
-- to insert already-existing rows.
--
-- Fix from 013/014/015: the guest-flow and cooked value passed the literal
-- Postgres keyword `desc`. Every language family in the DB uses `description`
-- for this column, so the cooked value uses `description` as well and posts to
-- the table with the same column list everywhere. `description` maps onto the
-- existing auditory description column used by the language-layer i18n so the
-- five-language UI is untouched.

CREATE TABLE IF NOT EXISTS guest_sessions (
    id VARCHAR(64) PRIMARY KEY,
    -- opaque, tamper-evident identifier the visitor uses to sign subsequent
    -- requests (server sets it in an httpOnly cookie).
    token_hash VARCHAR(96) NOT NULL,
    -- stable value used to reconstruct the browser cookie.
    display_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on the display id so a browser can only own one guest record.
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_display_id ON guest_sessions(display_id);

-- Foreign keys reuse the existing `languages` table so adding a language never
-- touches this migration.
ALTER TABLE guest_sessions
    ADD COLUMN IF NOT EXISTS free_language_id INT REFERENCES languages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days');

CREATE INDEX IF NOT EXISTS idx_guest_free_lang ON guest_sessions(free_language_id);

-- One row per visitor-entitlement scope. `free_language_id` records the single
-- free language the visitor chose on first selection; the paid rows below are the
-- scope of everything after.
CREATE TABLE IF NOT EXISTS language_entitlements (
    id SERIAL PRIMARY KEY,
    guest_session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    -- 'free' means the visitor got this language at no charge (one per guest).
    -- 'purchased' means the visitor paid for the global package covering it.
    -- 'available' means the content exists in that language (never a payment).
    access_type VARCHAR(16) NOT NULL
        CHECK (access_type IN ('free', 'purchased', 'available')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (guest_session_id, language_id)
);

COMMENT ON COLUMN language_entitlements.access_type IS 'access_type: free = one free language per guest; purchased = paid for via a package; available = content exists (never a payment).';
CREATE INDEX IF NOT EXISTS idx_ent_guest ON language_entitlements(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_ent_lang ON language_entitlements(language_id);

-- Note: the (available <> free/purchased) exclusivity for a (guest, language)
-- pair is enforced by the unique (guest_session_id, language_id) key plus the
-- app's atomic INSERT ... ON CONFLICT DO UPDATE logic in entitlementService.
-- A DB-level trigger is added by migration 017 (if it runs).

-- Package-language mapping. One row per language a package unlocks. Packages
-- that grant every language (all_languages = true) keep a single mapping row per
-- active language so the lookup is deterministic and can be checked without
-- reading the destination tables.
CREATE TABLE IF NOT EXISTS access_packages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    price INT GENERATED ALWAYS AS (
        (price_amount)::bigint * CASE currency WHEN 'VND' THEN 1 ELSE 100 END
    ) STORED NOT NULL,
    unlocks_all_languages BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    validity_start TIMESTAMPTZ,
    validity_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_packages_active
    ON access_packages(is_active) WHERE is_active;

-- Seed the default package row. A separate statement keeps the INSERT out of
-- the CREATE TABLE body and lets the CHECK constraint above stay valid.
INSERT INTO access_packages (code, name, description, price_amount, currency, is_active, validity_start, validity_end)
VALUES ('one-language', 'One additional language', 'Free language plus exactly one additional supported narration language, valid for the guest session', 1, 'VND', true, now() - interval '7 days', now() + interval '90 days')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    validity_start = EXCLUDED.validity_start,
    validity_end = EXCLUDED.validity_end,
    updated_at = now();


CREATE TABLE IF NOT EXISTS language_package_languages (
    package_id INT NOT NULL REFERENCES access_packages(id) ON DELETE CASCADE,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    PRIMARY KEY (package_id, language_id)
);
CREATE INDEX IF NOT EXISTS idx_pkg_lang ON language_package_languages(language_id);

-- Global, administrator-configured access packages. `unlocks_all_languages`
-- represents a package that unlocks every active language, and is enforced:
-- it cannot be set when the package has explicit mappings.
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    -- string such as a VNPay/MoMo order id, or a sandbox transaction id.
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

-- Keep monetary values stored without floating point errors. The `price` column
-- on access_packages is generated from `price_amount` at the same scale.
-- Idempotent monetary check. Re-running the migration must not fail on a
-- constraint that is already present.
DO $$ BEGIN
  ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS chk_payment_amount_non_negative;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE payment_transactions ADD CONSTRAINT chk_payment_amount_non_negative
    CHECK (amount >= 0) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_payment_guest ON payment_transactions(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_created ON payment_transactions(created_at);

-- Audit record of the entitlement decision. One row per successful payment, so a
-- webhook can report what was granted and when without touching the entitlement
-- row afterwards.
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
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_session ON language_entitlement_audit(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_user ON language_entitlement_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_status ON language_entitlement_audit(status);

-- Deterministic replay guard for payment webhooks. `provider_event_id` is the
-- provider's own event id; the unique index means a replayed or out-of-order
-- notification can never touch the same payment twice.
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
