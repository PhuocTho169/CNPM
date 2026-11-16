const db = require('../db');
const { ApiError } = require('../utils/errors');

/**
 * Attach the current guest session to req.guestSession.
 *
 * The cookie stores the display id (`g_hex…`), the PK is a UUID — match either.
 */
async function attachGuestSession(req, res, next) {
  try {
    const id =
      (req.cookies && req.cookies.guest_session_id) ||
      req.query.guest_session_id ||
      null;
    if (!id) return next();

    const session = await db.getOne(
      `SELECT id, display_id, free_language_id, free_language_id_2, purchased_languages, expires_at
       FROM guest_sessions
       WHERE id::text = $1 OR display_id = $1`,
      [String(id)]
    );
    if (!session) return next();

    // Expired sessions are deleted lazily and treated as "no session": the first
    // visit language selector is shown instead of an error.
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await db.query('DELETE FROM guest_sessions WHERE id = $1', [session.id]);
      return next();
    }

    req.guestSession = session;
    return next();
  } catch (err) {
    // Express 4 does not catch rejected async middleware promises; without this
    // a transient DB error would leave the request hanging forever.
    return next(err);
  }
}

/**
 * Gatekeeper for paid-content routes (audio & translations).
 *
 * Accepts either `?language=vi` (code, used by every public route) or
 * `?language_id=3` (numeric). Resolution rules:
 *   - the base language `vi` is always open, with or without a session;
 *   - admins/staff (req.user present via authenticate) bypass the paywall;
 *   - otherwise a guest session is REQUIRED, and the requested language must
 *     be the session's single free language or one of purchased_languages.
 *
 * Written in SQL against guest_sessions so the check is atomic and cannot be
 * bypassed by a client-side flag.
 */
const OPEN_LANGUAGE = 'vi';

async function requireLanguageUnlock(req, res, next) {
  try {
    const langCode = String(req.query.language || req.query.idx || '').toLowerCase();
    const idParam = Number(req.query.language_id) || Number(req.params.language_id);

    if (langCode === OPEN_LANGUAGE) return next();

    let languageId = idParam;
    if (!languageId && langCode) {
      const row = await db.getOne('SELECT id FROM languages WHERE LOWER(code) = $1', [langCode]);
      if (!row) return next(); // unknown code: handlers answer with their own 403/404
      languageId = row.id;
    }
    if (!languageId) return next();

    const session = req.guestSession;
    if (!session) {
      return next(
        new ApiError(403, 'LANGUAGE_LOCKED', 'This language is locked. Unlock it with free selection or purchase.')
      );
    }

    const ok = await db.getOne(
      `SELECT 1
         FROM guest_sessions
        WHERE id = $1
          AND (free_language_id = $2 OR free_language_id_2 = $2
               OR $2 = ANY(purchased_languages))`,
      [session.id, languageId]
    );
    if (ok) return next();

    return next(
      new ApiError(403, 'LANGUAGE_LOCKED', 'This language is locked. Unlock it with free selection or purchase.')
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = { attachGuestSession, requireLanguageUnlock };
