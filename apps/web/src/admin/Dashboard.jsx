import { useEffect, useState } from 'react';
import { api } from '../api/client';

function BarList({ items, valueKey, labelKey }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  return (
    <div className="bar-chart">
      {items.length === 0 && <div className="empty-state">No data yet</div>}
      {items.map((item, i) => (
        <div className="bar-row" key={i}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item[labelKey]}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${((item[valueKey] || 0) / max) * 100}%` }} /></span>
          <strong>{item[valueKey] || 0}</strong>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data }) {
  const w = 600, h = 170, pad = 26;
  const max = Math.max(1, ...data.map((d) => d.scans));
  const pts = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const y = h - pad - ((d.scans / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const labels = data.map((d, i) =>
    i % Math.ceil(data.length / 7) === 0 ? (
      <text key={i} x={pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1)} y={h - 6} fontSize="9" textAnchor="middle" fill="#6d6156">
        {String(d.day).slice(5, 10)}
      </text>
    ) : null
  );
  return (
    <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Scans over time">
      <polyline fill="none" stroke="#e65100" strokeWidth="2.5" points={pts.join(' ')} />
      {pts.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="#e65100" />;
      })}
      {labels}
    </svg>
  );
}

function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'vừa xong';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  return `${Math.floor(m / 60)} giờ trước`;
}

function OnlineUsers({ users }) {
  const deviceIcon = (d) => (d === 'mobile' ? '📱' : d === 'tablet' ? '📲' : '💻');
  return (
    <div className="chart-box">
      <h3>🟢 Đang truy cập website (5 phút qua): {users.length} khách</h3>
      {users.length === 0 ? (
        <div className="empty-state">Chưa có khách nào trong 5 phút qua.</div>
      ) : (
        <div className="bar-chart" style={{ display: 'grid', gap: '0.45rem' }}>
          {users.map((u, i) => (
            <div key={u.session_id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span>{deviceIcon(u.device_type)}</span>
              <strong style={{ minWidth: '6.5rem' }}>Khách #{String(u.session_id).slice(2, 8)}</strong>
              <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>
                {u.last_page ? <>trang <code style={{ fontSize: '0.75rem' }}>{u.last_page}</code> · </> : ''}
                {u.actions || 1} hoạt động · {timeAgo(u.last_seen)}
              </span>
              {u.platform ? <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>{u.platform}</span> : null}
            </div>
          ))}
        </div>
      )}
      <p style={{ color: 'var(--text-2)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
        Khách được đếm theo phiên ẩn danh (localStorage) — hoạt động đang ở trên trang, quét QR hoặc nghe audio trong 5 phút qua.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => api.get('/dashboard/statistics')
      .then((res) => { setStats(res.data.data); setError(null); })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load statistics'));
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <div className="spinner" />;

  const o = stats.overview || {};
  const cards = [
    ['Đang truy cập (5 phút)', o.users_online, '🟢'],
    ['Truy cập hôm nay', o.visitors_today, '🧑‍💻'],
    ['Total Places', o.total_places, '🍜'],
    ['Published', o.published_places, '✅'],
    ['Dishes', o.total_dishes, '🥢'],
    ['Languages', o.total_languages, '🌐'],
    ['Audio Guides', (o.total_audio || 0) + (o.total_dish_audio || 0), '🎧'],
    ['QR Codes', (o.total_place_qr || 0) + (o.total_dish_qr || 0), '🔳'],
    ['QR Scans', o.total_scans, '📲'],
    ['Audio Plays', o.total_plays, '▶️'],
  ];

  return (
    <>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Tự động cập nhật mỗi 30 giây · chuỗi 14 ngày</span>
      </div>

      <div className="stat-cards">
        {cards.map(([label, value, icon]) => (
          <div className="stat-card" key={label}>
            <div className="value">{value ?? 0}</div>
            <div className="label">{icon} {label}</div>
          </div>
        ))}
      </div>

      <OnlineUsers users={stats.online_users || []} />

      <div className="chart-box">
        <h3>📲 QR scans over time</h3>
        <LineChart data={stats.scans_over_time || []} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.4rem' }}>
        <div className="chart-box">
          <h3>🍜 Popular culinary places</h3>
          <BarList items={stats.top_places || []} valueKey="scan_count" labelKey="name" />
        </div>
        <div className="chart-box">
          <h3>🌐 Most used languages</h3>
          <BarList items={stats.languages || []} valueKey="scan_count" labelKey="native_name" />
        </div>
        <div className="chart-box">
          <h3>▶️ Audio plays per language</h3>
          <BarList items={stats.audio_plays_by_language || []} valueKey="play_count" labelKey="native_name" />
        </div>
        <div className="chart-box">
          <h3>📱 Visitors by device</h3>
          <BarList items={stats.devices || []} valueKey="count" labelKey="device_type" />
        </div>
        <div className="chart-box">
          <h3>⭐ Signature dishes</h3>
          <BarList items={stats.popular_dishes || []} valueKey="_unused" labelKey="name" />
        </div>
      </div>
    </>
  );
}
