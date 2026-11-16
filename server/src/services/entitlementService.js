const db = require('../db');

/**
 * Guest sessions + language paywall.
 *
 * One table now: guest_sessions holds the single free_language_id and the
 * purchased_languages INT[] array. No language_entitlements / access_packages /
 * payment rows — payments are granted sandbox-style by adding the language to
 * the array. The partial-free-then-purchase flow lives on this one row.
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
       SET token_hash = EXCLUDED.token_hash,
           expires_at = now() + interval '90 days'
     RETURNING id, display_id`,
    [id, tokenHash, displayId]
  );

  // The raw token is never stored — only its hash. It exists once, in this
  // return value, at creation time.
  return { id: row.id, token, displayId: row.display_id };
}

async function getGuestSessionByToken(token) {
  const row = await db.getOne(
    `SELECT id, display_id, free_language_id, free_language_id_2, purchased_languages, expires_at
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

async function invalidateGuestSession(idOrDisplay) {
  await db.query(
    'DELETE FROM guest_sessions WHERE id = $1 OR display_id = $1',
    [idOrDisplay]
  );
}

/** Free (both slots) + purchased languages joined into one entitlement summary row. */
async function getEntitlements(guestSession) {
  const purchasedIds = Array.isArray(guestSession.purchased_languages)
    ? guestSession.purchased_languages
    : (guestSession.purchased_languages || []);
  const freeIds = [guestSession.free_language_id, guestSession.free_language_id_2].filter(
    (id) => id !== null && id !== undefined
  ).map(Number);
  const hasAny = freeIds.length > 0 || purchasedIds.length > 0;
  return {
    free_language_id: freeIds[0] || null,
    free_language_id_2: freeIds[1] || null,
    free_languages: freeIds,
    purchased_languages: purchasedIds,
    unlocked: hasAny,
  };
}

/**
 * Selection of a free language. The guest owns TWO free slots (requirement:
 * at most 2 languages may be chosen for free, from the 3rd onward they pay).
 * Fills slot 1 when empty or already holding the same language, then slot 2;
 * with both slots taken by OTHER languages the update matches no row and the
 * caller maps `null` to a 409 so the frontend re-renders with what it has.
 */
async function grantFreeLanguage(guestSessionId, languageId) {
  return db.getOne(
    `UPDATE guest_sessions
        SET free_language_id = CASE
              WHEN free_language_id IS NULL OR free_language_id = $2 THEN $2
              ELSE free_language_id END,
            free_language_id_2 = CASE
              WHEN free_language_id IS NULL OR free_language_id = $2 THEN free_language_id_2
              ELSE $2 END,
            expires_at = GREATEST(expires_at, now() + interval '90 days')
      WHERE id = $1
        AND (free_language_id IS NULL OR free_language_id = $2
             OR free_language_id_2 IS NULL OR free_language_id_2 = $2)
      RETURNING id, free_language_id, free_language_id_2, purchased_languages, expires_at`,
    [guestSessionId, languageId]
  );
}

/** Both free slots taken by OTHER languages → conflict (409 in routes). */
async function hasFreeLanguageConflict(guestSessionId, languageId) {
  const row = await db.getOne(
    'SELECT free_language_id, free_language_id_2 FROM guest_sessions WHERE id = $1',
    [guestSessionId]
  );
  if (!row) return true;
  const taken = [row.free_language_id, row.free_language_id_2]
    .filter((id) => id !== null && id !== undefined)
    .map(Number);
  return taken.length >= 2 && !taken.includes(Number(languageId));
}

/** free (either slot) OR purchased — the entire unlock rule, single row. */
async function hasLanguageUnlock(guestSession, languageId) {
  if (!guestSession) return false;
  if (
    Number(guestSession.free_language_id) === Number(languageId) ||
    Number(guestSession.free_language_id_2) === Number(languageId)
  ) return true;
  const purchased = Array.isArray(guestSession.purchased_languages)
    ? guestSession.purchased_languages
    : [];
  return purchased.map(Number).includes(Number(languageId));
}

// ---------------- Checkouts (paywall transaction records) ----------------

// Sandbox price per additional language unlock — the provider is dead-simple,
// but the amount is server-owned so a client can never set "0".
const CHECKOUT_PRICE_VND = 20000;

/**
 * Start a checkout for one language on one guest session.
 *
 * - A language the guest already owns (free or purchased) → 409 ALREADY_UNLOCKED.
 * - An existing pending checkout for the same pair is reused (idempotent).
 * - amount/currency/provider are server-owned values.
 */
async function createCheckout(guestSession, languageId) {
  if (await hasLanguageUnlock(guestSession, languageId)) {
    return { conflict: true };
  }

  // Reuse a pending row for the same guest+language instead of stacking rows.
  const existing = await db.getOne(
    `SELECT * FROM checkouts
     WHERE guest_session_id = $1 AND language_id = $2 AND status = 'pending'`,
    [guestSession.id, languageId]
  );
  if (existing) return { reused: true, checkout: existing };

  const providerTransactionId = `d4_ck_${db.randomHex(8)}`;
  const idempotencyKey = `d4_g${guestSession.display_id}_l${languageId}`;
  const checkout = await db.getOne(
    `INSERT INTO checkouts (
        guest_session_id, language_id, amount, currency, provider,
        provider_transaction_id, idempotency_key
     )
     VALUES ($1, $2, $3, 'VND', 'SANDBOX', $4, $5)
     RETURNING *`,
    [guestSession.id, languageId, CHECKOUT_PRICE_VND, providerTransactionId, idempotencyKey]
  );
  return { checkout };
}

/**
 * Confirm a pending checkout: marks it success and grants the entitlement in
 * one transaction-ish path. The product rule is "20,000 VND once unlocks ALL
 * languages", so the successful payment replaces purchased_languages with the
 * full active catalog. Returns the updated guest row so the caller can reply
 * with the final entitlement state.
 *
 * Idempotent: confirming an already-successful checkout just returns it.
 */
async function confirmCheckout(checkoutId) {
  const checkout = await db.getOne('SELECT * FROM checkouts WHERE id = $1', [checkoutId]);
  if (!checkout) return { notFound: true };

  if (checkout.status === 'success') {
    const guest = await db.getOne('SELECT * FROM guest_sessions WHERE id = $1', [checkout.guest_session_id]);
    return { already: true, checkout, guest };
  }
  if (checkout.status === 'failed') {
    return { failed: true, checkout };
  }

  // Success → success: one guest+language may only ever have one success row
  // (partial unique index), so a replayed confirm cannot double-grant.
  const successRow = await db.getOne(
    `UPDATE checkouts
        SET status = 'success', paid_at = now()
      WHERE id = $1
        AND status = 'pending'
      RETURNING *`,
    [checkoutId]
  );

  const guest = await db.getOne(
    `UPDATE guest_sessions
        SET purchased_languages = (
          SELECT COALESCE(array_agg(id ORDER BY id), '{}')
          FROM languages WHERE is_active = true
        )
      WHERE id = $1
      RETURNING id, display_id, free_language_id, free_language_id_2, purchased_languages, expires_at`,
    [checkout.guest_session_id]
  );

  return { checkout: successRow || checkout, guest };
}

/**
 * VNPay-QR scan confirm (sandbox provider). The VNPay-QR payload carries the
 * checkout's provider_transaction_id; when the guest scans the QR the scan page
 * calls this path instead of the guest-owned confirm endpoint — the scanning
 * device is not the guest's session. A pending checkout flips to success and
 * the full-catalog entitlement is granted with the exact same one-transition
 * logic as confirmCheckout; the receipt is updated to provider 'VNPAY'.
 * Idempotent like every other confirm path.
 */
async function confirmCheckoutByProviderId(providerTransactionId) {
  const checkout = await db.getOne(
    'SELECT * FROM checkouts WHERE provider_transaction_id = $1',
    [providerTransactionId]
  );
  if (!checkout) return { notFound: true };

  // Record the (mock) payment channel while the row is still pending.
  if (checkout.status === 'pending') {
    await db.query(`UPDATE checkouts SET provider = 'VNPAY' WHERE id = $1`, [checkout.id]);
    checkout.provider = 'VNPAY';
  }
  return confirmCheckout(checkout.id);
}

/** All checkouts ever made by one guest, newest first. */
async function listCheckouts(guestSessionId) {
  return db.getMany(
    `SELECT c.id, c.language_id, l.code AS language_code, l.native_name,
            c.amount, c.currency, c.provider, c.status, c.paid_at, c.created_at
     FROM checkouts c
     JOIN languages l ON l.id = c.language_id
     WHERE c.guest_session_id = $1
     ORDER BY c.created_at DESC, c.id DESC`,
    [guestSessionId]
  );
}

async function getCheckoutForGuest(guestId, checkoutId) {
  const row = await db.getOne(
    `SELECT c.*, l.code AS language_code, l.native_name
     FROM checkouts c JOIN languages l ON l.id = c.language_id
     WHERE c.id = $1 AND c.guest_session_id = $2`,
    [checkoutId, guestId]
  );
  return row;
}

module.exports = {
  createGuestSession,
  getGuestSessionByToken,
  invalidateGuestSession,
  getEntitlements,
  grantFreeLanguage,
  hasFreeLanguageConflict,
  hasLanguageUnlock,
  createCheckout,
  confirmCheckout,
  confirmCheckoutByProviderId,
  listCheckouts,
  getCheckoutForGuest,
};
