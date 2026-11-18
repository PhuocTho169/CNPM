// =====================================================================
// AdminLogin.jsx — trang đăng nhập quản trị (route: /admin/login)
//
// BẢN ĐỒ FILE (muốn sửa gì thì tìm ở đây):
//   • Giao diện (màu, khoảng cách, bố cục) ... ../styles.css, mục "Admin login page"
//     (tìm chữ "al-page"; mọi class của trang này bắt đầu bằng "al-")
//   • Ảnh tô phở bên phải ..................... HERO_IMAGE_URL (bên dưới)
//   • Chữ hiển thị (tiêu đề, nhãn, nút) ....... object TEXT (bên dưới)
//   • Hiện/ẩn khung tài khoản demo ............ SHOW_DEMO_HINT (bên dưới)
//   • Gọi API đăng nhập ....................... hàm submit() (bên dưới)
//
// LOGIC ĐĂNG NHẬP THẬT NẰM Ở BACKEND (file này chỉ gửi dữ liệu đi):
//   POST /api/auth/login  { email, password }
//     → server/src/routes/index.js            (khai báo route)
//     → server/src/controllers/authController.js  login()  (kiểm tra đầu vào)
//     → server/src/services/authService.js        login()  (so mật khẩu, tạo JWT)
//   Server trả về { token, user }. File này lưu token vào localStorage
//   (key "d4_token", qua tokenStore) rồi chuyển sang /admin.
//
// FILE KHÁC CÓ DÍNH TỚI TRANG NÀY:
//   • ../App.jsx ................. khai báo <Route path="/admin/login">
//   • ./AdminLayout.jsx .......... đá về /admin/login nếu chưa đăng nhập
//   • ./adminApi.js .............. tokenStore (lưu/xóa token)
//   • ../api/client.js ........... axios `api`, apiErrorMessage()
//   • ../context/AppContext.jsx .. setUser() cập nhật user toàn site
// =====================================================================
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { tokenStore } from './adminApi';
import { useApp } from '../context/AppContext';

// ---------------------------------------------------------------------
// CẤU HÌNH — chỉnh ở đây, không cần đụng vào phần JSX bên dưới
// ---------------------------------------------------------------------

// Ảnh bên phải trang đăng nhập. File thật nằm ở:
//   apps/web/public/images/hero/admin-login-pho.png
// Vite phục vụ thư mục `public/` ở gốc site, nên đường dẫn bắt đầu bằng "/".
// MUỐN ĐỔI ẢNH: bỏ ảnh mới vào apps/web/public/images/hero/ rồi sửa tên file
// ở dòng dưới (ví dụ '/images/hero/hero-pho.png' hoặc '/images/dishes/bun-rieu-cua.png').
const HERO_IMAGE_URL = '/images/hero/admin-login-pho.png';
/*const HERO_IMAGE_ALT = 'Tô phở bò với rau thơm, chanh và tương ớt';* trình duyệt sẽ đọc alt này khi ảnh không tải được, hoặc cho người khiếm thị. */

// true = hiện khung "tài khoản demo" (chỉ nên bật khi đang dev).
// Tài khoản này lấy từ database/seeds/008_users_routes.sql.
// Trước khi đưa lên chạy thật: đổi thành false.
const SHOW_DEMO_HINT = true;

// Toàn bộ chữ trên trang. Đổi ngôn ngữ hoặc câu chữ chỉ cần sửa tại đây.
const TEXT = {
  title: 'District 4 Admin',
  subtitle: 'Quản lý địa điểm, món ăn và thuyết minh âm thanh.',
  emailLabel: 'Email',
  emailPlaceholder: 'admin@district4.local',
  passwordLabel: 'Mật khẩu',
  passwordPlaceholder: 'Nhập mật khẩu',
  showPassword: 'Hiện mật khẩu',
  hidePassword: 'Ẩn mật khẩu',
  submit: 'Đăng nhập',
  submitting: 'Đang đăng nhập…',
  backToSite: '← Về trang chủ',
  demoTitle: 'Tài khoản demo (chỉ dùng khi phát triển)',
};

// ---------------------------------------------------------------------
// Icon con mắt vẽ trực tiếp bằng SVG (không cần cài thêm thư viện).
// ---------------------------------------------------------------------
function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  // Cùng một "kho" user với trang công khai: đẩy user vào đây thì thanh menu
  // ngoài trang chủ hiện đúng tài khoản mà không cần tải lại trang.
  const { setUser } = useApp();

  // State của form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Gửi form: gọi API đăng nhập (xem "LOGIC ĐĂNG NHẬP THẬT" ở đầu file).
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      tokenStore.set(res.data.data.token);
      setUser(res.data.data.user || res.data.data);
      navigate('/admin');
    } catch (err) {
      // Thông báo lỗi do server trả về (sai mật khẩu, tài khoản bị khóa...)
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="al-page">
      {/* ---------- Cột trái: form đăng nhập ---------- */}
      <section className="al-form-side">
        <form className="al-form" onSubmit={submit}>
          <h1 className="al-title">{TEXT.title}</h1>
          <p className="al-subtitle">{TEXT.subtitle}</p>

          {error && <div className="al-error" role="alert">{error}</div>}

          <div className="al-field">
            <label htmlFor="al-email">{TEXT.emailLabel}</label>
            <input
              id="al-email"
              type="email"
              autoComplete="username"
              placeholder={TEXT.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="al-field">
            <label htmlFor="al-password">{TEXT.passwordLabel}</label>
            <div className="al-password-wrap">
              <input
                id="al-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={TEXT.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="al-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? TEXT.hidePassword : TEXT.showPassword}
                aria-pressed={showPassword}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          <button type="submit" className="al-submit" disabled={busy}>
            {busy ? TEXT.submitting : TEXT.submit}
          </button>

          {SHOW_DEMO_HINT && (
            <div className="al-hint">
              <strong>{TEXT.demoTitle}</strong>
              <br />
              admin@district4.local / Admin@123456
              <br />
              staff@district4.local / Staff@123456
            </div>
          )}

          <Link to="/" className="al-back">{TEXT.backToSite}</Link>
        </form>
      </section>

      {/* ---------- Cột phải: ảnh tô phở (đổi ảnh ở HERO_IMAGE_URL) ---------- */}
      <section className="al-photo-side">
        <img className="al-photo" src={HERO_IMAGE_URL} /*alt={HERO_IMAGE_ALT}* này là hiện đường dẫn ra màn hình*/ />
      </section>
    </div>
  );
}