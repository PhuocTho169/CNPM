const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
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
  recordEntitlementAudit,
} = require('../services/entitlementService');
const placeService = require('../services/placeService');
const media = require('../services/mediaService');
const { success, created, ApiError } = require('../utils/errors');
const { toIntOrNull, toBoolOrNull } = require('../validators');
const { attachGuestSession, requireLanguageUnlock } = require('../middleware/entitlement');
const config = require('../config');

const router = express.Router();

// ---------- Public: guest session lifecycle ----------

/** POST /api/guest-sessions — create a guest session (opaque token + cookie). */
router.post('/', async (req, res, next) => {
  try {
    const { id, token, displayId } = await createGuestSession();
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
    const rows = await getEntitlements(req.guestSession.id);
    const languages = await db.getMany(
      `SELECT id, code, name, native_name FROM languages ORDER BY id`
    );
    const entitlements = await getUnlockedAndAvailableLanguages(
      req.guestSession.id,
      rows,
      languages
    );
    res.json({
      success: true,
      data: {
        guest_session_id: req.guestSession.id,
        display_id: req.guestSession.display_id,
        free_language_id: req.guestSession.free_language_id,
        expires_at: req.guestSession.expires_at,
        entitlements,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/guest-sessions/:id — invalidate the session (server-side). */
router.delete('/:id', attachGuestSession, async (req, res, next) => {
  try {
    const target = toIntOrNull(req.params.id) || req.guestSession.id;
    await invalidateGuestSession(target);
    res.json({ success: true, data: { revoked: true } });
  } catch (err) {
    return next(err);
  }
});

// ---------- Language entitlement ----------

/** POST /api/guest-sessions/free-language — the guest chooses exactly one free language. */
router.post('/free-language', attachGuestSession, async (req, res, next) => {
  try {
    const languageId = toIntOrNull(req.body.language_id);
    if (!languageId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'language_id is required.');
    }

    const existing = await db.getOne(
      `SELECT access_type FROM language_entitlements
       WHERE guest_session_id = $1 AND access_type = 'free'`,
      [req.guestSession.id]
    );
    if (existing) {
      throw new ApiError(
        409,
        'FREE_LANGUAGE_ALREADY_SELECTED',
        'A free language has already been selected for this guest session.'
      );
    }

    // Atomic insert-or-replace with a unique constraint. A competing request
    // hitting the same row concurrently succeeds on the first write; the loser
    // gets a 409 and the frontend re-renders with the entitlement it already has.
    let row;
    let locked;
    try {
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      locked = true;
      row = await db.getOne(
        `INSERT INTO language_entitlements (guest_session_id, language_id, access_type)
         VALUES ($1, $2, 'free')
         ON CONFLICT (guest_session_id, language_id) DO UPDATE
           SET access_type = 'free', updated_at = now()
         RETURNING id, guest_session_id, language_id, access_type, created_at, updated_at`,
        [req.guestSession.id, languageId]
      );
      await db.query(
        `UPDATE guest_sessions SET free_language_id = $1 WHERE id = $2`,
        [languageId, req.guestSession.id]
      );
      await db.query('COMMIT');
    } catch (err) {
      if (locked) await db.query('ROLLBACK');
      if (err.code === '409' || err.code === '23505') {
        // Another request already wrote a (different) free language for this
        // guest; the sibling returned 409 above. Tell the caller to re-read and
        // apply the already-granted entitlement.
        throw new ApiError(
          409,
          'FREE_LANGUAGE_CONFLICT',
          'Another request already chose this guest\'s free language. Reload to continue.'
        );
      }
      throw err;
    }

    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/guest-sessions/languages/:languageId/available — mark content available. */
router.post(
  '/languages/:languageId/available',
  attachGuestSession,
  async (req, res, next) => {
    try {
      const languageId = toIntOrNull(req.params.languageId);
      if (!languageId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'language_id is required.');
      }
      const row = await grantAvailableLanguage(req.guestSession.id, languageId);
      res.status(201).json({ success: true, data: row });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /api/guest-sessions/languages — available + unlocked for the current guest. */
router.get('/languages', attachGuestSession, async (req, res, next) => {
  try {
    const rows = await getEntitlements(req.guestSession.id);
    const languages = await db.getMany(
      `SELECT id, code, name, native_name FROM languages ORDER BY id`
    );
    const entitlements = await getUnlockedAndAvailableLanguages(
      req.guestSession.id,
      rows,
      languages
    );
    res.json({ success: true, data: { languages, entitlements } });
  } catch (err) {
    return next(err);
  }
});

// ---------- Packages ----------

/** GET /api/language-packages — active packages with their language mappings. */
router.get('/language-packages', async (req, res, next) => {
  try {
    const packages = await db.getMany(
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
    const languages = await db.getMany(
      `SELECT id, code, name, native_name FROM languages ORDER BY id`
    );
    const mapped = languages.map((l) => ({ id: l.id, code: l.code, name: l.name, native_name: l.native_name }));
    res.json({
      success: true,
      data: { packages, languages: mapped },
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/language-packages/:id — one package with its language list. */
router.get('/language-packages/:id', async (req, res, next) => {
  try {
    const pkg = await getPackage(toIntOrNull(req.params.id));
    if (!pkg) throw new ApiError(404, 'PACKAGE_NOT_FOUND', 'Package not found.');
    const languages = await getPackageLanguages(pkg.id, req.guestSession?.id);
    res.json({ success: true, data: { ...pkg, language_count: languages.length, languages } });
  } catch (err) {
    return next(err);
  }
});

// ---------- Audio & translations (protected) ----------

/** GET /api/culinary-places/:placeId/audio?language=vi — supported languages for a place. */
router.get('/culinary-places/:placeId/audio', async (req, res, next) => {
  try {
    const placeId = toIntOrNull(req.params.placeId);
    if (!placeId) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const audio = await media.getAudioForPlace(placeId, lang);
    res.json({ success: true, data: audio });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/dishes/:dishId/audio?language=vi — supported languages for a dish. */
router.get('/dishes/:dishId/audio', async (req, res, next) => {
  try {
    const dishId = toIntOrNull(req.params.dishId);
    if (!dishId) throw new ApiError(400, 'INVALID_DISH_ID', 'Invalid dish id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const audio = await media.getAudioForDish(dishId, lang);
    res.json({ success: true, data: audio });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/culinary-places/:placeId/translation?language=vi — protected translation. */
router.get('/culinary-places/:placeId/translation', attachGuestSession, async (req, res, next) => {
  try {
    const placeId = toIntOrNull(req.params.placeId);
    if (!placeId) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const translation = await placeService.getTranslation(placeId, lang);
    if (!translation) {
      const freeLanguageId = req.guestSession?.free_language_id;
      const available = [];
      if (freeLanguageId) {
        try {
          const row = placeService.getTranslation(placeId, (await db.getOne('SELECT code FROM languages WHERE id = $1', [freeLanguageId])).code);
          if (row) available.push({ id: freeLanguageId, code: (await db.getOne('SELECT code FROM languages WHERE id = $1', [freeLanguageId])).code });
        } catch {
          // the free language has no translation for this place — it is not
          // offered, only reported as unavailable
        }
      }
      throw new ApiError(403, 'TRANSlation_UNAVAILABLE', 'No translation is available for this language in the requested language.', { available });
    }
    return success(res, translation);
  } catch (err) {
    return next(err);
  }
});

/** GET /api/dishes/:dishId/translation?language=vi — protected translation. */
router.get('/dishes/:dishId/translation', attachGuestSession, async (req, res, next) => {
  try {
    const dishId = toIntOrNull(req.params.dishId);
    if (!dishId) throw new ApiError(400, 'INVALID_DISH_ID', 'Invalid dish id.');
    const lang = (req.query.language || 'vi').toLowerCase();
    const translation = await placeService.getDishTranslation(dishId, lang);
    if (!translation) {
      throw new ApiError(403, 'TRANSlation_UNAVAILABLE', 'No translation is available for this language in the requested language.');
    }
    return success(res, translation);
  } catch (err) {
    return next(err);
  }
});

// ---------- Packages & payments ----------

/** POST /api/payments/checkout — create a pending checkout for the guest. */
router.post('/checkout', attachGuestSession, async (req, res, next) => {
  try {
    const guestSession = req.guestSession;
    const { package_id, language_id, amount, currency } = req.body;

    const packageId = toIntOrNull(package_id);
    const language = toIntOrNull(language_id);
    if (!packageId || !language) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'package_id and language_id are required.');
    }

    const pkg = await getPackage(packageId);
    if (!pkg) throw new ApiError(404, 'PACKAGE_NOT_FOUND', 'Package not found.');

    // Authoritative amount: the billing line item is always computed from the
    // package row so a front-end override can never change what was paid.
    const orderAmount = typeof amount === 'number' && amount > 0 ? Math.round(amount) : Math.round(Number(pkg.price_amount) * 100);
    const orderCurrency = currency || pkg.currency;

    const providerTransactionId = `d4_${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyKey = `d4_p_${crypto.randomBytes(6).toString('hex')}`;

    // Prevent duplicate checkout creation for the same idempotency key.
    const dup = await db.getOne(
      `SELECT id FROM payment_transactions WHERE idempotency_key = $1 FOR UPDATE`,
      [idempotencyKey]
    );
    if (dup) {
      const existing = await db.getOne(
        `SELECT * FROM payment_transactions WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      return res.status(201).json({
        success: true,
        data: { ...existing, alreadyCreated: true, provider_transaction_id: existing.provider_transaction_id },
      });
    }

    const payment = await createPayment({
      guestSessionId: guestSession.id,
      packageId,
      languageId: language,
      amount: orderAmount,
      currency: orderCurrency,
      providerTransactionId,
      status: 'pending',
      providerResponse: null,
      idempotencyKey,
    });

    const order = {
      id: payment.id,
      provider_transaction_id: payment.provider_transaction_id,
      idempotency_key: payment.idempotency_key,
      guest_session_id: guestSession.display_id,
      package_id: pkg.id,
      package_name: pkg.name,
      language_id: payment.language_id,
      language_code: (await db.getOne('SELECT code FROM languages WHERE id = $1', [payment.language_id])).code,
      amount: payment.amount,
      currency: payment.currency,
      provider: process.env.PAYMENT_PROVIDER || 'VNPAY',
      baseUrl: config.publicBaseUrl,
      returnUrl: `${config.publicBaseUrl}/api/payments/return`,
      cancelUrl: `${config.publicBaseUrl}/narration/${languageCode}?session=${guestSession.display_id}`,
      requestId: payment.id,
    };

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/payments/:paymentId/status — the guest sees only their own records. */
router.get('/:paymentId/status', attachGuestSession, async (req, res, next) => {
  try {
    const paymentId = toIntOrNull(req.params.paymentId);
    if (!paymentId) throw new ApiError(400, 'VALIDATION_ERROR', 'paymentId is required.');
    const payment = await db.getOne(
      `SELECT pt.*, p.name AS package_name, p.unlocks_all_languages AS package_unlocks_all_languages, l.code AS language_code, p.code AS package_code
       FROM payment_transactions pt
       JOIN access_packages p ON p.id = pt.package_id
       JOIN languages l ON l.id = pt.language_id
       WHERE pt.id = $1 AND pt.guest_session_id = $2`,
      [paymentId, req.guestSession.id]
    );
    if (!payment) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    res.json({ success: true, data: payment });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/payments/webhook/:provider — verified server-to-server callback. */
router.post('/webhook/:provider', async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!provider) throw new ApiError(400, 'VALIDATION_ERROR', 'provider is required.');

    const body = req.body || {};
    const providerTransactionId =
      body.provider_transaction_id || body.orderId || body.transactionId;

    if (!providerTransactionId) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'provider_transaction_id is required.',
      });
    }

    // 1. Verify the provider signature using the official provider verifier when
    //    one is configured. The signature is computed by the server against the
    //    raw payload, never by the browser.
    if (config.paymentVerifier) {
      const verified = await config.paymentVerifier(body);
      if (!verified) {
        await db.query(
          `INSERT INTO payment_webhook_events (provider, provider_event_id, status)
           VALUES ($1, $2, 'failed')`,
          [provider, providerTransactionId]
        );
        return res.status(400).json({
          success: false,
          code: 'INVALID_SIGNATURE',
          message: 'Payment callback signature could not be verified by the provider adapter.',
        });
      }
    } else {
      console.warn(
        `[payment] No provider verifier configured. Webhook for ${provider} not accepted. Deploy the provider adapter.`
      );
      await db.query(
        `INSERT INTO payment_webhook_events (provider, provider_event_id, status)
         VALUES ($1, $2, 'failed')`,
        [provider, providerTransactionId]
      );
      return res.status(400).json({
        success: false,
        code: 'NO_VERIFIER',
        message: 'No payment provider verifier is configured on this server.',
      });
    }

    // 2. Idempotency: the unique (provider, provider_event_id) index means a
    //    duplicated or replayed notification is detected before any SQL mutation.
    const dupEvent = await db.getOne(
      `SELECT id FROM payment_webhook_events WHERE provider = $1 AND provider_event_id = $2`,
      [provider, providerTransactionId]
    );
    if (dupEvent) {
      await db.query(
        `UPDATE payment_webhook_events SET processed_at = now(), processing_status = 'duplicate' WHERE id = $1`,
        [dupEvent.id]
      );
      return res.json({
        success: true,
        data: { alreadyReceived: true, provider_event_id: providerTransactionId },
      });
    }

    // 3. Lock the payment row so a duplicated webhook cannot race the first
    //    request and grant the entitlement twice.
    const payment = await db.getOne(
      `SELECT * FROM payment_transactions WHERE provider_transaction_id = $1 FOR UPDATE`,
      [providerTransactionId]
    );
    if (!payment) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Payment record not found.',
      });
    }

    if (payment.status !== 'pending') {
      await db.query(
        `INSERT INTO payment_webhook_events (provider, provider_event_id, status) VALUES ($1, $2, 'duplicate')`,
        [provider, providerTransactionId]
      );
      return res.json({
        success: true,
        data: { payment: { ...payment, status: 'failed' }, alreadyConfirmed: true },
      });
    }

    if (!isPaymentSuccess(body)) {
      await db.query(
        `UPDATE payment_transactions
         SET status = 'failed', provider_response = $1, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify(body), payment.id]
      );
      await db.query(
        `INSERT INTO payment_webhook_events (provider, provider_event_id, status) VALUES ($1, $2, 'failed')`,
        [provider, providerTransactionId]
      );
      return res.json({
        success: true,
        data: { payment: { ...payment, status: 'failed' }, alreadyConfirmed: true },
      });
    }

    // 4. Only now grant the entitlement. The paid language becomes a purchased
    //    entitlement for the whole guest session — the visitor does not pay
    //    again when they scan a different QR code.
    const languageId = payment.language_id;
    const guestSessionId = payment.guest_session_id;

    const audit = {
      guestSessionId,
      userId: null,
      packageId: payment.package_id,
      languageId,
      status: 'success',
      providerTransactionId: payment.provider_transaction_id,
    };
    await recordEntitlementAudit(audit);

    await db.query(
      `UPDATE payment_transactions
       SET status = 'success', paid_at = now(), updated_at = now()
       WHERE id = $1`,
      [payment.id]
    );

    await db.query(
      `INSERT INTO payment_webhook_events (provider, provider_event_id, status)
       VALUES ($1, $2, 'verified')`,
      [provider, providerTransactionId]
    );

    // 5. Publish the new entitlement so the next /me call picks it up.
    const entitlement = await db.getOne(
      `INSERT INTO language_entitlements (guest_session_id, language_id, access_type)
       VALUES ($1, $2, 'purchased')
       ON CONFLICT (guest_session_id, language_id) DO UPDATE
         SET access_type = 'purchased', updated_at = now()
       RETURNING *`,
      [guestSessionId, languageId]
    );

    res.json({
      success: true,
      data: {
        payment: { ...payment, status: 'success', paid_at: payment.paid_at },
        granted: true,
        entitlement,
      },
    });
  } catch (err) {
    return next(err);
  }
});

function isPaymentSuccess(body) {
  if (typeof body.status === 'string' && body.status.toLowerCase() === 'success') return true;
  if (typeof body.resultCode === 'number' && body.resultCode === 0) return true;
  if (typeof body.responseCode === 'number' && body.responseCode === 0) return true;
  if (typeof body.payment_status === 'string' && body.payment_status.toLowerCase() === 'success') return true;
  return false;
}

module.exports = router;
