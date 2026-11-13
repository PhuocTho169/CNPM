import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

/**
 * Language-selection banner — the FIRST thing a visitor sees on a place guide
 * page (rendered above everything in PlaceGuide).
 *
 * Product rule (server-backed, guest_sessions):
 *   free slots      : up to 2 languages chosen free (free_language_id + _2)
 *   3rd and further : pay 20,000 VND ONCE → every language unlocks, both here
 *                     and server-side (requireLanguageUnlock middleware).
 *
 * `forced` = the guest has not unlocked ANY language yet → the banner is a
 * non-dismissable dialog. Otherwise it only opens after a click on a locked
 * language chip.
 */
export default function LanguageBanner({ onSelected }) {
  const {
    guestSession, languages, lang, setLang,
    freeLanguages, setFreeLanguages,
    purchasedLanguages, setPurchasedLanguages,
    t,
  } = useApp();

  const [loaded, setLoaded] = useState(false);
  const [openManual, setOpenManual] = useState(false); // opened by a locked chip click
  const [payPick, setPayPick] = useState(null);        // {code, native_name, id} behind the paywall
  const [paying, setPaying] = useState(false);
  const [payScreen, setPayScreen] = useState(null);    // 'vnpay' | 'success' — dedicated payment banner
  const [vnpay, setVnpay] = useState(null);            // { qr_svg, amount, currency, provider_transaction_id }
  const [err, setErr] = useState(null);
  const timer = useRef(null);
  const pollRef = useRef(null);

  /** Stop the VNPay status poller (unmount / cancel / success). Declared
   * BEFORE the effects below — they list it in their dependency arrays, and a
   * later declaration would throw "Cannot access before initialization" on
   * every render. */
  const clearPoll = useCallback(() => {
    if (!pollRef.current) return;
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const chosenIds = [...freeLanguages, ...purchasedLanguages].map(Number);
  const freeSlotsUsed = freeLanguages.length;
  const freeSlotsLeft = Math.max(0, 2 - freeSlotsUsed);
  const unlockAll = purchasedLanguages.length > 0;

  // Load the current entitlements once a guest session exists (or was restored
  // by the cookie server-side). Without this the banner cannot know which
  // languages the visitor already unlocked.
  useEffect(() => {
    if (!guestSession) return;
    api.get('/guest-sessions/me')
      .then((res) => {
        const d = res.data.data || {};
        setFreeLanguages(d.free_languages || [d.free_language_id, d.free_language_id_2].filter(Boolean).map(Number));
        setPurchasedLanguages(d.purchased_languages || []);
      })
      .catch(() => {/* stay locked: the banner stays open and retry happens on next pick */})
      .finally(() => setLoaded(true));
  }, [guestSession, setFreeLanguages, setPurchasedLanguages]);

  // The navbar 🌐 button re-opens the banner anywhere on public pages via a
  // window event — the banner instance lives inside PlaceGuide nationally.
  useEffect(() => {
    const open = () => {
      setLoaded(true);
      setErr(null);
      setPayPick(null); setPayScreen(null); setOpenManual(true); clearPoll();
    };
    window.addEventListener('open-language-banner', open);
    return () => window.removeEventListener('open-language-banner', open);
  }, [clearPoll]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); clearPoll(); }, [clearPoll]);

  const lockedPills = languages.length > 0 && languages.every((l) => l.id === undefined);
  const forced = loaded && !lockedPills && chosenIds.length === 0 && languages.length > 0;
  const show = forced || openManual;

  // Pick a language: unlocked chip switches instantly; a locked chip uses a
  // free slot while one is left, otherwise it opens the paywall view.
  const handlePick = useCallback((l) => {
    setErr(null);
    const id = Number(l.id);
    if (!id) { // fallback list (languages API down): just switch, no entitlement
      setLang(l.code);
      setOpenManual(false);
      onSelected?.(l.code);
      return;
    }
    if (chosenIds.includes(id) || unlockAll) {
      setLang(l.code);
      setOpenManual(false);
      setPayPick(null);
      onSelected?.(l.code);
      return;
    }
    if (freeSlotsLeft > 0 && !paying) {
      api.post('/guest-sessions/free-language', { language_id: id })
        .then((res) => {
          const d = res.data.data || {};
          setFreeLanguages((prev) => {
            const next = [...prev, id];
            return Array.from(new Set(next.map(Number)));
          });
          setPurchasedLanguages(d.purchased_languages || []);
          setLang(l.code);
          setOpenManual(false);
          onSelected?.(l.code);
        })
        .catch((e) => setErr(e?.response?.data?.message || 'Network error'));
      return;
    }
    // No free slot left → 20.000đ to unlock everything.
    setPayPick(l);
  }, [chosenIds, freeSlotsLeft, unlockAll, paying, setLang, setFreeLanguages, setPurchasedLanguages, onSelected]);

  /**
   * Payment confirmed (the QR scan already set the server state): adopt the
   * refreshed entitlements, switch the active language, show the success card,
   * then close both banners. Runs once — the poller is removed first.
   */
  const finishPayment = useCallback((pick) => {
    clearPoll();
    api.get('/guest-sessions/me')
      .then((res) => {
        const d = res.data.data || {};
        setFreeLanguages(d.free_languages || []);
        setPurchasedLanguages(d.purchased_languages || []);
      })
      .catch(() => { /* even if the refresh fails, success is already shown */ })
      .finally(() => {
        setPayPick(null);
        setPayScreen('success');
        timer.current = setTimeout(() => {
          setPayScreen(null); // close payment banner
          setPaying(false);
          setOpenManual(false); // close language banner too
        }, 1800);
        if (pick) { setLang(pick.code); onSelected?.(pick.code); }
      });
  }, [clearPoll, setLang, onSelected]);

  /**
   * Pay 20.000đ to unlock all languages — VNPay-QR flow (sandbox):
   *   1. POST /checkouts → pending checkout + server-rendered VNPay QR
   *   2. banner shows the QR; scanning it (with any bank/camera app) opens
   *      /pay/<txid>, which confirms the checkout server-side immediately
   *   3. this page polls the checkout status and unlocks every language on
   *      success. No real money: the confirm is mocked, as the product demands.
   */
  const handlePay = useCallback(() => {
    if (!payPick || paying) return;
    setPaying(true);
    setErr(null);
    setVnpay(null);
    api.post('/guest-sessions/checkouts', { language_id: Number(payPick.id) })
      .then((res1) => {
        const checkout = res1.data.data || {};
        setVnpay(checkout.vnpay || null);
        setPayScreen('vnpay'); // dedicated VNPay-QR banner over the language banner

        clearPoll();
        let polls = 0;
        pollRef.current = setInterval(() => {
          polls += 1;
          if (polls > 240) { clearPoll(); return; } // ~6 min, then give up silently
          api.get(`/guest-sessions/checkouts/${checkout.id}`)
            .then((res) => {
              if (res.data.data?.status === 'success') finishPayment(payPick);
            })
            .catch(() => { /* transient server hiccup — next poll retries */ });
        }, 1500);
      })
      .catch((e) => {
        setPayScreen(null);
        setErr(e?.response?.data?.message || 'Payment failed');
        setPaying(false);
      });
  }, [payPick, paying, clearPoll, finishPayment]);

  /** Close the VNPay-QR banner without confirming (checkout stays pending). */
  const cancelVnpay = useCallback(() => {
    clearPoll();
    setPayScreen(null);
    setVnpay(null);
    setPaying(false);
  }, [clearPoll]);

  if (!show) return null;

  return (
    <div className="lang-banner-overlay">
      <div className="lang-banner" role="dialog" aria-modal="true" aria-label={t('chooseLanguage')}>
        <div className="lang-banner-head">
          <h2>🌐 {t('chooseLanguage')}</h2>
          {!forced && (
            <button
              type="button"
              className="lang-banner-close"
              aria-label="Close"
              onClick={() => { setOpenManual(false); setPayPick(null); setErr(null); }}
            >
              ✕
            </button>
          )}
        </div>
        <p className="lang-banner-hint">{t('selectLanguageHint')}</p>
        <div className="lang-banner-slots">
          <span className={`chip ${unlockAll ? 'chip-teal' : freeSlotsLeft > 0 ? 'chip' : 'chip-outline'}`}>
            {unlockAll ? '✅ ' + t('langPayDone') : t('langFreeBadge', { n: freeSlotsLeft })}
          </span>
        </div>

        <div className="lang-picker" role="radiogroup" aria-label={t('chooseLanguage')}>
          {languages.map((l) => {
            const locked = !unlockAll && !chosenIds.includes(Number(l.id));
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={l.code === lang}
                className={
                  'lang-pill' +
                  (l.code === lang ? ' active' : '') +
                  (locked && freeSlotsLeft === 0 ? ' locked' : '') +
                  (locked && freeSlotsLeft > 0 ? ' free-available' : '')
                }
                onClick={() => handlePick(l)}
                disabled={paying}
              >
                {l.native_name}
                {' '}
                {!unlockAll && chosenIds.includes(Number(l.id)) && <small>· {t('langSelected')}</small>}
                {!unlockAll && locked && <small>· {freeSlotsLeft > 0 ? t('langFree') : '🔒 20.000đ'}</small>}
              </button>
            );
          })}
        </div>

        {payPick && !paying && (
          <div className="lang-pay-panel">
            <p>{t('langPayPrompt')}</p>
            <button type="button" className="btn btn-orange" onClick={handlePay}>{t('langPayButton')}</button>
          </div>
        )}
        {err && !payScreen && <p className="lang-banner-note error">{err}</p>}
      </div>

      {/* Dedicated payment banner shown from the moment the visitor taps Pay,
          through the VNPay-QR scan, until the success screen closes. */}
      {payScreen && (
        <div className="pay-overlay">
          <div className="pay-card vnpay-card" role="alertdialog" aria-live="polite">
            {payScreen === 'vnpay' ? (
              <>
                <div className="vnpay-brand" aria-hidden="true">
                  <span className="vnpay-logo">VNPAY</span>
                  <span className="vnpay-mode">QR</span>
                </div>
                {vnpay?.qr_svg
                  ? <img className="vnpay-qr" src={vnpay.qr_svg} alt="VNPay QR" width={210} height={210} />
                  : <span className="pay-spinner" aria-hidden="true" />}
                <div className="pay-amount">
                  {new Intl.NumberFormat('vi-VN').format(vnpay?.amount || 20000)}₫
                </div>
                <p className="pay-title">{t('vnpayPayTitle')}</p>
                <p className="vnpay-hint">{t('vnpayScanHint')}</p>
                <p className="vnpay-waiting">⏳ {t('vnpayWaiting')}</p>
                <button type="button" className="btn btn-ghost btn-sm vnpay-cancel" onClick={cancelVnpay}>
                  {t('vnpayCancel')}
                </button>
                <p className="pay-sub">VNPAY · {vnpay?.currency || 'VND'} · SANDBOX</p>
              </>
            ) : (
              <>
                <span className="pay-check" aria-hidden="true">✔</span>
                <div className="pay-amount">{t('langPayDone')}</div>
                <p className="pay-sub">20.000₫ · VNPAY · VND</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
