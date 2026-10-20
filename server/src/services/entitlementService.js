const db = require('../db');
const { ApiError } = require('../utils/errors');

/**
 * Guest sessions
 */

async function createGuestSession() {
  const id = db.randomUuid();
  const token = db.randomBase64url(32);
  const displayId = `g_${db.randomHex(12)}`;
  const tokenHash = db.sha256(token);

  const row = await db.getOne(
    `INSERT INTO guest_sessions (id, token_hash, display_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (display_id) DO UPDATE
       SET updated_at = now(), token_hash = EXCLUDED.token_hash
     RETURNING id, token, display_id`,
    [id, tokenHash, displayId]
  );

  return { id: row.id, token, displayId };
}

async function getGuestSessionByToken(token) {
  const row = await db.getOne(
    `SELECT id, token_hash, display_id, free_language_id, expires_at
     FROM guest_sessions
     WHERE token_hash = $1`,
    [db.sha256(token)]
  );
  if (!row) return null;

  // Enforce absolute expiry so an old guest record cannot silently revive after
  // the cookie is copied onto a long-lived device.
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await db.query('DELETE FROM guest_sessions WHERE id = $1', [row.id]);
    return null;
  }
  return row;
}

async function invalidateGuestSession(id) {
  await db.query('DELETE FROM guest_sessions WHERE id = $1', [id]);
}

/**
 * Language entitlements
 */

async function getEntitlements(guestSessionId) {
  return db.getMany(
    `SELECT le.language_id, le.access_type
     FROM language_entitlements le
     WHERE le.guest_session_id = $1`,
    [guestSessionId]
  );
}

/**
 * Insert or update the single free language for one guest session. `ON CONFLICT`
 * rolls the previous selection back atomically, so two concurrent requests
 * never leave two free languages on the same guest.
 */
async function grantFreeLanguage(guestSessionId, languageId) {
  return db.getOne(
    `INSERT INTO language_entitlements (guest_session_id, language_id, access_type)
     VALUES ($1, $2, 'free')
     ON CONFLICT (guest_session_id, language_id) DO UPDATE
       SET access_type = 'free', updated_at = now()
     RETURNING *`,
    [guestSessionId, languageId]
  );
}

async function grantAvailableLanguage(guestSessionId, languageId) {
  return db.getOne(
    `INSERT INTO language_entitlements (guest_session_id, language_id, access_type)
     VALUES ($1, $2, 'available')
     ON CONFLICT (guest_session_id, language_id) DO UPDATE
       SET access_type = 'available', updated_at = now()
     RETURNING *`,
    [guestSessionId, languageId]
  );
}

async function hasAnyEntitlement(guestSessionId, languageId) {
  const row = await db.getOne(
    `SELECT 1 FROM language_entitlements
     WHERE guest_session_id = $1 AND language_id = $2
       AND access_type IN ('free', 'purchased')`,
    [guestSessionId, languageId]
  );
  return !!row;
}

/** True when a guest session owns an active package that unlocks every language. */
async function hasActivePackageEntitlement(guestSessionId) {
  const row = await db.getOne(
    `SELECT 1
     FROM language_entitlements le
     JOIN guest_sessions gs ON gs.id = le.guest_session_id
     JOIN access_packages p
       ON p.id = le.package_id
      AND p.is_active = true
      AND (p.validity_start IS NULL OR p.validity_start <= now())
      AND (p.validity_end IS NULL OR p.validity_end >= now())
     WHERE le.guest_session_id = $1
       AND le.access_type = 'purchased'
       AND p.unlocks_all_languages = true`,
    [guestSessionId]
  );
  return !!row;
}

/**
 * After a package or free language is granted we recompute the full set of
 * languages that are available to the guest and attach the access state.
 */
async function getUnlockedAndAvailableLanguages(
  guestSessionId,
  entitlementRows,
  languages
) {
  const rows = entitlementRows || [];
  const unlocked = new Map();
  const available = new Map();

  for (const lang of languages) {
    available.set(lang.id, false);
  }

  for (const row of rows) {
    const lang = languages.find((l) => l.id === row.language_id);
    if (!lang) continue;

    // Free selection: always unlocked, regardless of content presence.
    if (row.access_type === 'free') {
      unlocked.set(lang.id, true);
      available.set(lang.id, true);
      continue;
    }

    // Package that unlocks every language: every active language is unlocked.
    if (row.access_type === 'purchased' && row.package_id) {
      const pkg = await db.getOne(
        `SELECT unlocks_all_languages FROM access_packages WHERE id = $1`,
        [row.package_id]
      );
      if (pkg?.unlocks_all_languages) {
        unlocked.set(lang.id, true);
        available.set(lang.id, true);
        continue;
      }
    }

    // Explicit package-language mapping.
    if (row.access_type === 'purchased' && row.package_id) {
      const mapping = await db.getOne(
        `SELECT 1 FROM language_package_languages lpl
         WHERE lpl.package_id = $1 AND lpl.language_id = $2`,
        [row.package_id, lang.id]
      );
      if (mapping) {
        unlocked.set(lang.id, true);
        available.set(lang.id, true);
      }
      continue;
    }

    // 'available' entitlement records are only content metadata; never unlock.
  }

  return rows.map((row) => ({
    language_id: row.language_id,
    language_code: row.language_code,
    access_type: row.access_type,
    ...unlocked.get(row.language_id)
      ? { unlocked: true, available: true }
      : { unlocked: false, available: available.get(row.language_id) },
  }));
}

/**
 * Package-language mapping
 */

async function getPackageLanguages(packageId, guestSessionId) {
  if (!packageId) return [];
  return db.getMany(
    `SELECT l.id, l.code, l.name, l.native_name
     FROM language_package_languages lpl
     JOIN languages l ON l.id = lpl.language_id
     WHERE lpl.package_id = $1
       AND (p.validity_start IS NULL OR p.validity_start <= now())
       AND (p.validity_end IS NULL OR p.validity_end >= now())
     ORDER BY l.id`,
    [packageId]
  );
}

/**
 * Access packages
 */

async function listPackages() {
  const rows = await db.getMany(
    `SELECT p.*,
            COALESCE((
              SELECT count(*)::int
              FROM language_package_languages lpl
              WHERE lpl.package_id = p.id
            ), 0) AS language_count
     FROM access_packages p
     WHERE p.is_active
     ORDER BY p.id`
  );
  return rows;
}

async function getPackage(id) {
  return db.getOne(`SELECT * FROM access_packages WHERE id = $1`, [id]);
}

/**
 * Payment transactions
 */

async function createPayment({
  guestSessionId,
  packageId,
  languageId,
  amount,
  currency,
  providerTransactionId,
  status,
  providerResponse,
  idempotencyKey,
}) {
  return db.getOne(
    `INSERT INTO payment_transactions (guest_session_id, package_id, language_id,
         currency, amount, provider_transaction_id, status, provider_response,
         idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      guestSessionId,
      packageId,
      languageId,
      currency,
      amount,
      providerTransactionId,
      status,
      providerResponse,
      idempotencyKey,
    ]
  );
}

async function findPendingOrSuccessByProviderTransaction(providerTransactionId) {
  return db.getOne(
    `SELECT * FROM payment_transactions
     WHERE provider_transaction_id = $1 AND status IN ('pending', 'success')`,
    [providerTransactionId]
  );
}

async function countExistingSuccessfulTransaction(guestSessionId) {
  return db.getOne(
    `SELECT count(*)::int AS c FROM payment_transactions
     WHERE guest_session_id = $1 AND status = 'success'`,
    [guestSessionId]
  );
}

async function recordEntitlementAudit({ guestSessionId, userId, packageId, languageId, status, providerTransactionId }) {
  await db.query(
    `INSERT INTO language_entitlement_audit (guest_session_id, user_id, package_id, language_id, status, provider_transaction_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [guestSessionId, userId, packageId, languageId, status, providerTransactionId]
  );
}

module.exports = {
  createGuestSession,
  getGuestSessionByToken,
  invalidateGuestSession,
  getEntitlements,
  grantFreeLanguage,
  grantAvailableLanguage,
  hasAnyEntitlement,
  hasActivePackageEntitlement,
  getUnlockedAndAvailableLanguages,
  listPackages,
  getPackage,
  getPackageLanguages,
  createPayment,
  findPendingOrSuccessByProviderTransaction,
  countExistingSuccessfulTransaction,
  recordEntitlementAudit,
};
