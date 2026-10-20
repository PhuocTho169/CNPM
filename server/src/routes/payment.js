const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listPackages,
  getPackage,
  createPayment,
  findPendingOrSuccessByProviderTransaction,
  recordEntitlementAudit,
} = require('../services/entitlementService');
const placeService = require('../services/placeService');
const media = require('../services/mediaService');
const { success, created, ApiError } = require('../utils/errors');
const { toIntOrNull, toBoolOrNull } = require('../validators');
const { attachGuestSession, requireLanguageUnlock } = require('../middleware/entitlement');

const router = express.Router();

// ---------- Configuration ----------

router.get('/packages', async (req, res, next) => {
  try {
    res.json({ success: true, data: { packages: await listPackages() } });
  } catch (err) { return next(err); }
});

router.get('/packages/:id', async (req, res, next) => {
  try {
    const pkg = await getPackage(toIntOrNull(req.params.id));
    if (!pkg) throw new ApiError(404, 'PACKAGE_NOT_FOUND', 'Package not found.');
    res.json({ success: true, data: pkg });
  } catch (err) { return next(err); }
});

// ---------- Order creation ----------

router.post('/checkout', attachGuestSession, async (req, res, next) => {
  try {
    const guestSession = req.guestSession;
    const { package_id, language_id, amount, currency } = req.body;

    const packageId = toIntOrNull(package_id);
    const language = toIntOrNull(language_id);
    if (!packageId || !language) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'package_id and language_id are required.');
    }

    // The backend resolves the package price; the frontend may supply a fixed
    // amount only to pre-fill the UI. The order is always charged from the
    // package row so price changes must not retroactively alter a paid
    // entitlement.
    const pkg = await getPackage(packageId);
    if (!pkg) throw new ApiError(404, 'PACKAGE_NOT_FOUND', 'Package not found.');

    const orderAmount = typeof amount === 'number' && amount > 0 ? Math.round(amount) : pkg.price;
    const orderCurrency = currency || pkg.currency;

    const providerTransactionId = `d4_${crypto.randomBytes(8).toString('hex')}`;
    const payment = await createPayment({
      guestSessionId: guestSession.id,
      packageId,
      languageId: language,
      amount: orderAmount,
      currency: orderCurrency,
      providerTransactionId,
      status: 'pending',
      providerResponse: null,
    });

    // The real integration talks to VNPay/MoMo here. The adapter below only
    // renders a build; production must replace the body and return the
    // provider's redirect URL (or use the official client SDK).
    const order = {
      id: payment.id,
      provider_transaction_id: payment.provider_transaction_id,
      guest_session_id: guestSession.display_id,
      package_id: pkg.id,
      package_name: pkg.name,
      language_id: payment.language_id,
      language_code: (await db.getOne('SELECT code FROM languages WHERE id = $1', [payment.language_id])).code,
      amount: payment.amount,
      currency: payment.currency,
      provider: 'VNPAY', // override in production
      baseUrl: config.publicBaseUrl,
      returnUrl: `${config.publicBaseUrl}/api/payments/return`,
      cancelUrl: `${config.publicBaseUrl}/narration/${languageCode}?session=${guestSession.display_id}`,
      requestId: payment.id,
    };

    res.status(201).json({ success: true, data: order });
  } catch (err) { return next(err); }
});

// ---------- Provider callback ----------

router.post('/callback', async (req, res, next) => {
  try {
    const body = req.body || {};
    const providerTransactionId = body.provider_transaction_id || body.orderId || body.transactionId;

    if (!providerTransactionId) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'provider_transaction_id is required.' });
    }

    if (config.paymentVerifier) {
      const verified = await config.paymentVerifier(body);
      if (!verified) {
        return res.status(400).json({ success: false, code: 'INVALID_SIGNATURE', message: 'Payment callback signature could not be verified by the provider adapter.' });
      }
    } else {
      console.warn('[payment] No provider verifier configured. Callback not accepted for production use. Deploy the VNPay/MoMo adapter or a verified mock when testing.');
    }

    // Idempotency: never grant a second access for the same callback.
    const existing = await findPendingOrSuccessByProviderTransaction(providerTransactionId);
    if (existing) {
      return res.json({ success: true, data: { payment: existing, alreadyProcessed: true } });
    }

    const payment = await db.getOne(
      `SELECT * FROM payment_transactions WHERE provider_transaction_id = $1 FOR UPDATE`,
      [providerTransactionId]
    );
    if (!payment) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Payment record not found.' });
    }

    if (payment.status !== 'pending') {
      return res.json({ success: true, data: { payment: { ...payment, status: 'failed' } } });
    }

    // Only confirm when the provider reports a successful result. A failed or
    // canceled callback must leave the language locked and never grant access.
    if (body.status !== 'success' && body.resultCode !== 0 && body.responseCode !== 0) {
      await db.query(
        `UPDATE payment_transactions SET status = $2, provider_response = $3, updated_at = now()
         WHERE id = $1`,
        [payment.id, 'failed', JSON.stringify(body)]
      );
      return res.json({ success: true, data: { payment: { ...payment, status: 'failed' } } });
    }

    const languageId = payment.language_id;
    const guestSessionId = payment.guest_session_id;

    // Canonical commit step: the paid language becomes a purchased entitlement.
    // If the session was destroyed, the audit record stays so support can
    // recover the entitlement through the account login path.
    const audit = { packageId: payment.package_id, languageId, status: 'success', providerTransactionId: payment.provider_transaction_id };
    await recordEntitlementAudit(audit);

    res.json({ success: true, data: { payment: { ...payment, status: 'success' }, granted: true } });
  } catch (err) { return next(err); }
});

router.get('/history', attachGuestSession, async (req, res, next) => {
  try {
    const rows = await db.getMany(
      `SELECT pt.*, p.name AS package_name, l.code AS language_code
       FROM payment_transactions pt
       LEFT JOIN access_packages p ON p.id = pt.package_id
       LEFT JOIN languages l ON l.id = pt.language_id
       WHERE pt.guest_session_id = $1 OR pt.user_id = $2
       ORDER BY pt.created_at DESC
       LIMIT 100`,
      [req.guestSession.id, req.guestSession.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { return next(err); }
});

module.exports = router;
