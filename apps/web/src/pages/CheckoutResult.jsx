import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

/**
 * Landing page encoded inside the VNPay-QR of the language paywall:
 *   ${webBase}/pay/<provider_transaction_id>
 *
 * Opening this page IS the payment (sandbox): the mount POST confirms the
 * checkout server-side, which grants the full language catalog to the guest
 * session. No guest session is required here — the scanning device is not
 * necessarily the guest's own phone; the opaque transaction id is the key.
 */
export default function CheckoutResult() {
  const { txid } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!txid) {
      setState('error');
      return;
    }
    api.post(`/guest-sessions/vnpay/${encodeURIComponent(txid)}/confirm`)
      .then(() => setState('success'))
      .catch((err) => {
        setMessage(err?.response?.data?.message || err?.message || 'Network error');
        setState('error');
      });
  }, [txid]);

  return (
    <div className="checkout-result">
      <div className="pay-card vnpay-card checkout-card" role="status" aria-live="polite">
        <div className="vnpay-brand" aria-hidden="true">
          <span className="vnpay-logo">VNPAY</span>
          <span className="vnpay-mode">QR</span>
        </div>

        {state === 'loading' && (
          <>
            <span className="pay-spinner" aria-hidden="true" />
            <p className="pay-title">Đang xử lý giao dịch…</p>
            <p className="pay-sub">Processing the transaction…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <span className="pay-check" aria-hidden="true">✔</span>
            <div className="pay-amount">20.000₫</div>
            <p className="pay-title">GIAO DỊCH THÀNH CÔNG</p>
            <p className="vnpay-hint">
              Toàn bộ ngôn ngữ đã được mở khóa cho phiên của bạn.
            </p>
            <p className="pay-sub">TRANSACTION SUCCESS · VNPAY · VND</p>
            <p className="vnpay-en-note">All languages unlocked for your session.</p>
          </>
        )}

        {state === 'error' && (
          <>
            <span className="pay-fail" aria-hidden="true">✖</span>
            <p className="pay-title">GIAO DỊCH KHÔNG HỢP LỆ</p>
            {message && <p className="vnpay-hint">{message}</p>}
            <p className="pay-sub">TRANSACTION FAILED · VNPAY</p>
            <p className="vnpay-en-note">
              This transaction is invalid or has already been processed. Please
              restart the payment on the guide page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
