import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useApp } from '../context/AppContext';

/**
 * Camera QR scanner.
 *
 * Works entirely in the browser: the camera stream is drawn to a <canvas> and
 * decoded with jsQR on every animation frame — no backend involved. That means
 * it behaves the same whether the site is opened from a phone or a laptop.
 *
 * On success we navigate to the place page, e.g. a QR encoding
 * http://192.168.1.53:8080/place/1 → /place/1 on this device.
 */

// Extract a place id from whatever the QR encodes: a full URL, a relative
// path, or a bare number.
function resolvePlacePath(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return `/place/${value}`;

  // Strip any scheme/host so we read only the path portion.
  let path = value;
  try {
    if (/^https?:\/\//i.test(value)) path = new URL(value).pathname;
  } catch {
    return null;
  }
  const match = path.match(/^\/place\/(\d+)/);
  return match ? `/place/${match[1]}` : null;
}

export default function QrScanner({ onClose }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const doneRef = useRef(false);

  const [status, setStatus] = useState('starting'); // starting | scanning | denied | unsupported | found
  const [error, setError] = useState(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      try {
        // `facingMode: environment` = rear camera, the one pointed at the QR code.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true'); // iOS: otherwise it opens fullscreen
        await video.play();
        setStatus('scanning');

        const tick = () => {
          if (cancelled || doneRef.current) return;
          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            const placePath = code?.data ? resolvePlacePath(code.data) : null;
            if (placePath) {
              doneRef.current = true;
              setStatus('found');
              navigate(placePath);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Camera unavailable');
          setStatus('denied');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [navigate]);

  function submitManual(e) {
    e.preventDefault();
    const path = resolvePlacePath(manual);
    if (path) {
      doneRef.current = true;
      navigate(path);
    } else {
      setError(t('qrManualInvalid'));
    }
  }

  const labels = {
    starting: t('qrStarting'),
    scanning: t('qrScanning'),
    denied: t('qrDenied'),
    unsupported: t('qrUnsupported'),
    found: t('qrFound'),
  };

  return (
    <div className="qr-scanner">
      <div className="qr-scanner-head">
        <strong>📷 {t('scanQr')}</strong>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('close')}>✕</button>
      </div>

      <div className="qr-viewport">
        <video ref={videoRef} className="qr-video" muted playsInline />
        <canvas ref={canvasRef} hidden />
        {status !== 'scanning' && (
          <div className="qr-overlay">
            <p>{labels[status]}</p>
            {error && <p className="no-audio-note">{error}</p>}
          </div>
        )}
        {status === 'scanning' && <div className="qr-frame" aria-hidden="true" />}
      </div>

      {status !== 'scanning' && (
        <form className="qr-manual" onSubmit={submitManual}>
          <label htmlFor="qr-manual-input">{t('qrManualLabel')}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="qr-manual-input"
              type="text"
              inputMode="url"
              placeholder="/place/1"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit">{t('qrOpen')}</button>
          </div>
          <p className="no-audio-note" style={{ marginTop: '0.5rem' }}>
            {t('qrCameraHint')}
          </p>
        </form>
      )}
    </div>
  );
}