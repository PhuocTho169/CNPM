const db = require('../db');
const { ApiError } = require('../utils/errors');

/** Attach the current guest session to req.guestSession. */
async function attachGuestSession(req, res, next) {
  const id =
    (req.cookies && req.cookies.guest_session_id) ||
    req.query.guest_session_id ||
    null;
  if (!id) return next();

  const session = await db.getOne(
    `SELECT id, token_hash, display_id, free_language_id, expires_at
     FROM guest_sessions
     WHERE id = $1`,
    [id]
  );
  if (!session) return next();

  // Expired sessions are deleted lazily and treated as "no session": the first
  // visit language selector is shown instead of an error.
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await db.query('DELETE FROM guest_sessions WHERE id = $1', [session.id]);
    return next();
  }

  req.guestSession = session;
  next();
}

/**
 * Require that the guest session (or an authenticated account) may unlock the
 * requested language. Covers:
 *   - the single free language,
 *   - a purchased entitlement for the language,
 *   - a package that unlocks every language.
 *
 * The check is written entirely in SQL so it is atomic and cannot be bypassed
 * by a client-side flag. It is applied to every transcription and audio route.
 */
async function requireLanguageUnlock(req, res, next) {
  const languageId = Number(req.query.language_id) || Number(req.params.language_id);
  if (!languageId) return next();

  const session = req.guestSession;
  const account = req.user ? { id: req.user.sub } : null;

  if (!session && !account) {
    return next(
      new ApiError(403, 'LANGUAGE_LOCKED', 'This language is locked. Unlock it with free selection or purchase.')
    );
  }

  // 1. Free language — the guest's single permanent selection.
  const freeMatch = await db.getOne(
    `SELECT 1 FROM guest_sessions WHERE id = $1 AND free_language_id = $2`,
    [session.id, languageId]
  );
  if (freeMatch) return next();

  // 2. Purchased entitlement for this language.
  const purchasedMatch = await db.getOne(
    `SELECT 1 FROM language_entitlements
     WHERE guest_session_id = $1 AND language_id = $2 AND access_type = 'purchased'`,
    [session.id, languageId]
  );
  if (purchasedMatch) return next();

  // 3. A package that unlocks every language. The package row is authoritative;
  //    the backend computes the list instead of trusting the frontend.
  const packageMatch = await db.getOne(
    `SELECT 1
     FROM access_packages p
     JOIN language_package_languages lpl ON lpl.package_id = p.id
     WHERE p.is_active = true
       AND lpl.language_id = $1
       AND (p.validity_start IS NULL OR p.validity_start <= now())
       AND (p.validity_end IS NULL OR p.validity_end >= now())
       AND p.unlocks_all_languages = true`,
    [languageId]
  );
  if (packageMatch) return next();

  // 4. The backend never exposes paid audio or paid transcription for a locked
  //    language, whatever the visitor's browser says.
  return next(
    new ApiError(403, 'LANGUAGE_LOCKED', 'This language is locked. Unlock it with free selection or purchase.')
  );
}

module.exports = { attachGuestSession, requireLanguageUnlock };
