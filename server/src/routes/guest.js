const express = require('express');
const QRCode = require('qrcode');
const config = require('../config');
const db = require('../db');
const entitlement = require('../services/entitlementService');
const placeService = require('../services/placeService');
const catalogService = require('../services/catalogService');
const { success, created, ApiError } = require('../utils/errors');
const { toIntOrNull } = require('../validators');
const { attachGuestSession, requireLanguageUnlock } = require('../middleware/entitlement');

const router = express.Router();

// ---------------- VNPay-QR (sandbox payment) ----------------

/** localhost origins are never scannable from another device. */
function isLocalOrigin(origin) {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(origin).hostname);
  } catch {
    return true;
  }
}

/**
 * Target encoded in the VNPay-QR: a URL of the paywall web app that, when the
 * QR is scanned and opened, confirms the checkout and unlocks all languages.
 * Same base-URL rule as the place/dish QR codes: prefer a non-local
 * PUBLIC_BASE_URL, otherwise fall back to the request Origin — the QR must
 * resolve from the phone or second device doing the scan, not this machine.
 */
function vnpayTargetUrl(req, checkout) {
  const base =
    (!isLocalOrigin(config.publicBaseUrl) && config.publicBaseUrl) ||
    req.headers.origin ||
    config.publicBaseUrl;
  return `${String(base).replace(/\/$/, '')}/pay/${encodeURIComponent(checkout.provider_transaction_id)}`;
}

/** SVG data URL: crisp at any size the paywall card renders it at. */
async function buildVnpayQr(req, checkout) {
  const url = vnpayTargetUrl(req, checkout);
  const svg = await QRCode.toString(url, {
    type: 'svg',
    width: 512,
    margin: 1,
    color: { dark: '#0f5f9c', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
  return {
    provider: 'VNPAY',
    status: checkout.status,
    amount: checkout.amount,
    currency: checkout.currency,
    provider_transaction_id: checkout.provider_transaction_id,
    url,
    qr_svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  };
}

// ---------- Public: guest session lifecycle ----------

/** POST /api/guest-sessions — create a guest session (opaque token + cookie). */
router.post('/', async (req, res, next) => {
  try {
    const { id, token, displayId } = await entitlement.createGuestSession();
    res
      .cookie('guest_session_id', displayId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      })
      .json({
        success: true,
        data: {
          guest_session_id: id,
          token,
          display_id: displayId,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/me — current guest's entitlement summary. */
router.get('/me', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) {
      throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    }
    const summary = await entitlement.getEntitlements(req.guestSession);
    res.json({
      success: true,
      data: {
        guest_session_id: req.guestSession.id,
        display_id: req.guestSession.display_id,
        free_language_id: summary.free_language_id,
        free_language_id_2: summary.free_language_id_2,
        free_languages: summary.free_languages,
        purchased_languages: summary.purchased_languages,
        expires_at: req.guestSession.expires_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/guest-sessions/:id — invalidate the session (server-side). */
router.delete('/:id', attachGuestSession, async (req, res, next) => {
  try {
    const target = String(req.params.id || '') || req.guestSession.id;
    await entitlement.invalidateGuestSession(target);
    res.clearCookie('guest_session_id');
    res.json({ success: true, data: { revoked: true } });
  } catch (err) {
    return next(err);
  }
});

// ---------- Language entitlements (single free + purchases) ----------

/** POST /api/guest-sessions/free-language — the guest chooses exactly one free language. */
router.post('/free-language', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) {
      throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    }
    const languageId = toIntOrNull(req.body.language_id);
    if (!languageId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'language_id is required.');
    }

    const language = await db.getOne('SELECT id, code FROM languages WHERE id = $1', [languageId]);
    if (!language) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');

    if (await entitlement.hasFreeLanguageConflict(req.guestSession.id, languageId)) {
      throw new ApiError(
        409,
        'FREE_LANGUAGE_ALREADY_SELECTED',
        "Both free languages have already been selected for this guest session."
      );
    }

    const row = await entitlement.grantFreeLanguage(req.guestSession.id, languageId);
    if (!row) {
      throw new ApiError(
        409,
        'FREE_LANGUAGE_CONFLICT',
        "Another request already chose this guest's free language. Reload to continue."
      );
    }

    res.status(201).json({
      success: true,
      data: {
        guest_session_id: row.id,
        free_language_id: row.free_language_id,
        purchased_languages: row.purchased_languages,
        language_code: language.code,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/languages — catalog + what this guest can open. */
router.get('/languages', attachGuestSession, async (req, res, next) => {
  try {
    const languages = await db.getMany(
      `SELECT id, code, name, native_name FROM languages WHERE is_active = true ORDER BY id`
    );
    let unlocked = [];
    let free_language_id = null;
    let purchased_languages = [];
    if (req.guestSession) {
      const summary = await entitlement.getEntitlements(req.guestSession);
      free_language_id = summary.free_language_id;
      purchased_languages = summary.purchased_languages;
      const unlockedIds = [...(summary.free_languages || []), ...purchased_languages].filter(Boolean).map(Number);
      unlocked = languages.filter((l) => unlockedIds.includes(l.id));
    }
    res.json({
      success: true,
      data: { languages, free_language_id, purchased_languages, unlocked },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/guest-sessions/languages/:languageId/purchase — sandbox grant.
 * Replaces the old checkout/webhook flow: the row is updated instantly and the
 * language joins purchased_languages.
 */
router.post('/languages/:languageId/purchase', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) {
      throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    }
    const languageId = toIntOrNull(req.params.languageId);
    if (!languageId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'language_id is required.');
    }
    const language = await db.getOne('SELECT id, code FROM languages WHERE id = $1', [languageId]);
    if (!language) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');

    const row = await entitlement.purchaseLanguage(req.guestSession.id, languageId);
    res.status(201).json({
      success: true,
      data: {
        guest_session_id: row.id,
        free_language_id: row.free_language_id,
        purchased_languages: row.purchased_languages,
        granted: { language_id: languageId, language_code: language.code },
        sandbox: true,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ---------- Checkouts (pay-to-unlock transaction records) ----------

/**
 * POST /api/guest-sessions/checkouts — start a checkout for one language.
 * The guest's free language is chosen at scan time; every other language goes
 * through this endpoint. Idempotent per guest+language (pending rows reused).
 */
router.post('/checkouts', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    const languageId = toIntOrNull(req.body.language_id);
    if (!languageId) throw new ApiError(400, 'VALIDATION_ERROR', 'language_id is required.');

    const language = await db.getOne('SELECT id, code, native_name FROM languages WHERE id = $1', [languageId]);
    if (!language) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');

    const result = await entitlement.createCheckout(req.guestSession, languageId);
    if (result.conflict) {
      throw new ApiError(409, 'ALREADY_UNLOCKED', 'This language is already unlocked for this guest session.');
    }
    const vnpay = await buildVnpayQr(req, result.checkout);
    res.status(201).json({
      success: true,
      data: {
        ...result.checkout,
        reused: !!result.reused,
        language_code: language.code,
        language_name: language.native_name,
        vnpay,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/checkouts — this guest's checkout history. */
router.get('/checkouts', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    return success(res, await entitlement.listCheckouts(req.guestSession.id));
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/checkouts/:id — one checkout, guest-owned only. */
router.get('/checkouts/:id', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    const id = toIntOrNull(req.params.id);
    if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'checkout id is required.');
    const row = await entitlement.getCheckoutForGuest(req.guestSession.id, id);
    if (!row) throw new ApiError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found.');
    return success(res, row);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/guest-sessions/checkouts/:id/confirm — sandbox provider confirm.
 * Marks the checkout success and grants the unlock (purchased_languages) in the
 * same step. Idempotent: replaying a confirm returns the existing result.
 */
router.post('/checkouts/:id/confirm', attachGuestSession, async (req, res, next) => {
  try {
    if (!req.guestSession) throw new ApiError(404, 'GUEST_SESSION_NOT_FOUND', 'Create a guest session first.');
    const id = toIntOrNull(req.params.id);
    if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'checkout id is required.');

    const owned = await entitlement.getCheckoutForGuest(req.guestSession.id, id);
    if (!owned) throw new ApiError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found.');

    const result = await entitlement.confirmCheckout(id);
    if (result.notFound) throw new ApiError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found.');
    if (result.failed) {
      throw new ApiError(409, 'CHECKOUT_FAILED', 'This checkout has failed and cannot be confirmed. Start a new one.');
    }

    return success(res, {
      checkout: result.checkout,
      guest: result.guest
        ? {
            display_id: result.guest.display_id,
            free_language_id: result.guest.free_language_id,
            purchased_languages: result.guest.purchased_languages,
          }
        : null,
      already_confirmed: !!result.already,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------- Guest-scoped content access ----------

/**
 * POST /api/guest-sessions/vnpay/:providerTransactionId/confirm — the page that
 * the VNPay-QR encodes calls THIS endpoint when the QR is scanned: scanning =
 * paying (sandbox, instant, no real money). The pending checkout flips to
 * success and every active language joins purchased_languages. The scanning
 * device is not the guest's session, so the route is keyed by the opaque
 * provider_transaction_id and needs no guest session.
 */
router.post('/vnpay/:providerTransactionId/confirm', async (req, res, next) => {
  try {
    const providerTransactionId = String(req.params.providerTransactionId || '');
    if (!providerTransactionId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'provider_transaction_id is required.');
    }

    const result = await entitlement.confirmCheckoutByProviderId(providerTransactionId);
    if (result.notFound) throw new ApiError(404, 'CHECKOUT_NOT_FOUND', 'VNPay transaction not found.');
    if (result.failed) {
      throw new ApiError(409, 'CHECKOUT_FAILED', 'This transaction has failed and cannot be confirmed. Start a new one.');
    }

    return success(res, {
      checkout: result.checkout,
      already_confirmed: !!result.already,
      guest: result.guest
        ? {
            display_id: result.guest.display_id,
            free_language_id: result.guest.free_language_id,
            purchased_languages: result.guest.purchased_languages,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/culinary-places/:placeId/translation?language=vi */
router.get('/culinary-places/:placeId/translation', attachGuestSession, requireLanguageUnlock, async (req, res, next) => {
  try {
    const placeId = toIntOrNull(req.params.placeId);
    if (!placeId) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const translation = await placeService.getTranslation(placeId, lang);
    if (!translation) {
      throw new ApiError(403, 'TRANSLATION_UNAVAILABLE', 'No translation is available for this language in the requested language.');
    }
    return success(res, translation);
  } catch (err) {
    return next(err);
  }
});

/** GET /api/guest-sessions/dishes/:dishId/translation?language=vi */
router.get('/dishes/:dishId/translation', attachGuestSession, requireLanguageUnlock, async (req, res, next) => {
  try {
    const dishId = toIntOrNull(req.params.dishId);
    if (!dishId) throw new ApiError(400, 'INVALID_DISH_ID', 'Invalid dish id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const translation = await catalogService.getDishTranslation(dishId, lang);
    if (!translation) {
      throw new ApiError(403, 'TRANSLATION_UNAVAILABLE', 'No translation is available for this language in the requested language.');
    }
    return success(res, translation);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
