import { api, getSessionId } from '../api/client';

// Device label mirroring the detection used in PlaceGuide (scan logging), so
// the dashboard's device breakdown and online list use the same vocabulary.
function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Fire-and-forget presence ping for the dashboard's "Đang truy cập (5 phút)".
// Failures are swallowed — tracking must never break a page for the visitor.
export function pingVisit(path) {
  api.post('/activity/ping', {
    session_id: getSessionId(),
    device_type: detectDeviceType(),
    platform: navigator.platform || '',
    path: path || (typeof location !== 'undefined' ? location.pathname : ''),
  }).catch(() => {});
}
