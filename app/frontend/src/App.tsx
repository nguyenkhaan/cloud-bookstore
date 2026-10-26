import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import './App.css';
import {
  getAccessTokenExpiration,
  getRouteDecision,
  getSafeNextPath,
  isAccessTokenUsable,
} from './auth/session.js';
import { MainLayout } from './components/layout';
import { Card, StatCard, SearchIcon } from './components/common';

type LocationState = { pathname: string; search: string };
type Session = { accessToken: string; refreshToken: string };
type LoginPayload = { accessToken?: unknown; refreshToken?: unknown };

const readLocation = (): LocationState => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

const navigate = (to: string, replace = false) => {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const apiUrl = (path: string) =>
  `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}${path}`;

export function App() {
  const [location, setLocation] = useState<LocationState>(readLocation);
  const [session, setSession] = useState<Session | null>(null);
  const decision = getRouteDecision(location.pathname, location.search, session?.accessToken);

  useEffect(() => {
    const updateLocation = () => setLocation(readLocation());
    window.addEventListener('popstate', updateLocation);
    return () => window.removeEventListener('popstate', updateLocation);
  }, []);

  useEffect(() => {
    if (decision.type !== 'redirect' || typeof decision.to !== 'string') return;
    navigate(decision.to, true);
  }, [decision]);

  useEffect(() => {
    const expiration = getAccessTokenExpiration(session?.accessToken);
    if (expiration === null) return;
    const timeout = window.setTimeout(() => {
      setSession(null);
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`, true);
    }, Math.max(0, expiration - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.search, session?.accessToken]);

  if (decision.type === 'redirect') {
    return <StatusPage message="Phiên đăng nhập đã hết hạn. Đang chuyển đến trang đăng nhập…" />;
  }

  if (location.pathname === '/login') {
    return <LoginPage search={location.search} onSignIn={setSession} />;
  }
  if (location.pathname === '/forgot-password') {
    return <ForgotPasswordPage />;
  }
  if (location.pathname === '/reset-password') {
    return <ResetPasswordPage search={location.search} />;
  }
  if (location.pathname === '/verify-email') {
    return <VerifyEmailPage search={location.search} />;
  }
  if (location.pathname === '/dashboard') {
    return (
      <Dashboard
        onSignOut={() => {
          setSession(null);
          navigate('/', true);
        }}
      />
    );
  }
  if (location.pathname === '/checkout') {
    return <Checkout />;
  }
  if (location.pathname === '/inventory/new' || /^\/inventory\/[^/]+\/edit$/.test(location.pathname)) {
    return <InventoryEditor />;
  }
  if (location.pathname === '/catalog') {
    return <Catalog />;
  }

  return <Home />;
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [currentTab, setCurrentTab] = useState('overview');

  return (
    <MainLayout
      currentPath={currentTab}
      onNavigate={(id) => {
        if (id === 'overview') {
          setCurrentTab('overview');
        } else {
          setCurrentTab(id);
        }
      }}
      screenCode={currentTab === 'overview' ? 'SCR-REP-01 / TỔNG QUAN' : undefined}
      pageTitle={currentTab === 'overview' ? 'Tổng quan kinh doanh' : undefined}
      user={{
        name: 'Nguyễn Minh Anh',
        role: 'Quản trị viên',
      }}
    >
      {currentTab === 'overview' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Chào Minh Anh, đây là nhịp vận hành Nhà sách Mây hôm nay · Cập nhật 18/10/2026 10:24</span>
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Đăng xuất
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Bán + Thuê đã quyết toán"
              value="8.420.000đ"
              valueColor="emerald"
              description="Bán 6.200.000đ + Thuê 2.220.000đ"
            />
            <StatCard
              label="Số dư két tiền mặt"
              value="12.680.000đ"
              valueColor="default"
              description="2 két đang hoạt động"
            />
            <StatCard
              label="Cọc đang giữ · Nợ phải trả"
              value="18.600.000đ"
              valueColor="amber"
              description="KHÔNG tính vào doanh thu"
            />
            <StatCard
              label="Phiếu thuê lưu hành"
              value="84"
              valueColor="default"
              description="12 phiếu quá hạn cần thu hồi"
            />
            <StatCard
              label="VietQR đối soát thành công"
              value="98,4%"
              valueColor="emerald"
              description="Mục tiêu > 95% · 123/125 lượt"
            />
          </div>

          <Card title="Hoạt động cần chú ý hôm nay">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs">
                <span className="font-bold text-rose-700">12 phiếu quá hạn</span>
                <p className="text-slate-600 mt-1 text-[11px]">8 khách đã quá hạn trên 7 ngày, ưu tiên liên hệ thu hồi.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
                <span className="font-bold text-amber-700">18 đầu sách chạm min</span>
                <p className="text-slate-600 mt-1 text-[11px]">5 đầu sách không còn bản khả dụng. Cần tạo phiếu nhập kho.</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                <span className="font-bold text-emerald-700">Đối soát VietQR</span>
                <p className="text-slate-600 mt-1 text-[11px]">Tất cả giao dịch trực tuyến đã khớp lệnh thành công.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <SearchIcon size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Phân hệ đang được chuẩn bị</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Layout chung đã được gắn kết sẵn sàng cho các trang tiếp theo theo đúng kiến trúc nghiệp vụ.
          </p>
        </div>
      )}
    </MainLayout>
  );
}

function PublicHeader() {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate('/')}>
        Cloud Bookstore
      </button>
      <nav aria-label="Điều hướng chính">
        <button onClick={() => navigate('/catalog')}>Danh mục</button>
        <button onClick={() => navigate('/dashboard')}>Khu vực nhân viên</button>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <Page>
      <section className="hero">
        <p className="eyebrow">Đọc, khám phá, quay lại</p>
        <h1>Một hiệu sách công khai cho độc giả — và không gian riêng cho đội ngũ.</h1>
        <p>Danh mục luôn mở. Những thao tác quản trị, tạo phiếu và thanh toán chỉ xuất hiện sau khi nhân viên đăng nhập.</p>
        <div className="actions">
          <button className="primary" onClick={() => navigate('/catalog')}>
            Xem danh mục
          </button>
          <button className="secondary" onClick={() => navigate('/dashboard')}>
            Đăng nhập nhân viên
          </button>
        </div>
      </section>
    </Page>
  );
}

function Catalog() {
  return (
    <Page>
      <section className="page-heading">
        <p className="eyebrow">Danh mục công khai</p>
        <h1>Những cuốn sách đang chờ được mở ra.</h1>
        <p>Bạn có thể xem tự do. Thanh toán sẽ yêu cầu đăng nhập và tự giữ lại trang đích để quay về.</p>
      </section>
      <article className="book-card">
        <span className="book-spine" aria-hidden="true">CB</span>
        <div>
          <p className="book-meta">Tuyển chọn cuối tuần</p>
          <h2>Những ngày ở hiệu sách</h2>
          <p>Một tựa sách mẫu cho catalog công khai.</p>
        </div>
        <button className="primary" onClick={() => navigate('/checkout')}>
          Tiến hành thanh toán
        </button>
      </article>
    </Page>
  );
}

function Checkout() {
  return (
    <Page>
      <section className="page-heading">
        <p className="eyebrow">Thanh toán</p>
        <h1>Phiên của bạn còn hợp lệ.</h1>
        <p>Đây là route được guard. Token hết hạn sẽ không cho tiếp tục thao tác.</p>
      </section>
    </Page>
  );
}

function InventoryEditor() {
  return (
    <Page>
      <section className="page-heading">
        <p className="eyebrow">Quản lý kho</p>
        <h1>Biểu mẫu thao tác nội bộ</h1>
        <p>Route tạo và sửa được bảo vệ cùng một quy tắc với dashboard và thanh toán.</p>
      </section>
    </Page>
  );
}

function LoginPage({
  search,
  onSignIn,
}: {
  search: string;
  onSignIn: (session: Session) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload: LoginPayload = await response.json().catch(() => ({}));
      if (
        !response.ok ||
        typeof payload.accessToken !== 'string' ||
        typeof payload.refreshToken !== 'string'
      ) {
        setError('Không thể đăng nhập. Hãy kiểm tra thông tin hoặc thử lại sau.');
        return;
      }
      if (!isAccessTokenUsable(payload.accessToken)) {
        setError('Máy chủ trả về phiên không hợp lệ. Hãy thử lại.');
        return;
      }
      onSignIn({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
      navigate(getSafeNextPath(new URLSearchParams(search).get('next')), true);
    } catch {
      setError('Không thể kết nối tới máy chủ. Hãy thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Cloud Bookstore / Staff</p>
        <h1>Chào mừng trở lại.</h1>
        <p>Đăng nhập để tiếp tục công việc đang làm.</p>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Mật khẩu
          <input
            autoComplete="current-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <button
          className="link-button"
          onClick={() => navigate('/forgot-password')}
          type="button"
        >
          Quên mật khẩu?
        </button>
      </form>
    </main>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch(apiUrl('/api/auth/password-reset-requests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setSubmitted(true);
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Khôi phục mật khẩu</p>
        <h1>Nhận liên kết đặt lại.</h1>
        <p>Vì bảo mật, thông báo luôn giống nhau dù email có tồn tại hay không.</p>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        {submitted && (
          <p className="success" role="status">
            Nếu tài khoản đang hoạt động, bạn sẽ nhận được email đặt lại mật khẩu.
          </p>
        )}
        <button className="primary" type="submit">
          Gửi liên kết
        </button>
        <button
          className="link-button"
          onClick={() => navigate('/login')}
          type="button"
        >
          Quay lại đăng nhập
        </button>
      </form>
    </main>
  );
}

function ResetPasswordPage({ search }: { search: string }) {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const token = new URLSearchParams(search).get('token');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setMessage('Liên kết đặt lại không hợp lệ.');
      return;
    }
    const response = await fetch(apiUrl('/api/auth/password-resets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    }).catch(() => null);
    setMessage(
      response?.ok
        ? 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.'
        : 'Liên kết không hợp lệ hoặc đã hết hạn.'
    );
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Đặt lại mật khẩu</p>
        <h1>Tạo mật khẩu mới.</h1>
        <label>
          Mật khẩu mới
          <input
            minLength={12}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>
        {message && <p className="success" role="status">{message}</p>}
        <button className="primary" type="submit">
          Lưu mật khẩu mới
        </button>
      </form>
    </main>
  );
}

function VerifyEmailPage({ search }: { search: string }) {
  const token = new URLSearchParams(search).get('token');
  const [message, setMessage] = useState(
    token ? 'Đang xác thực tài khoản…' : 'Liên kết xác thực không hợp lệ.'
  );
  const requestedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (requestedToken.current === token) return;
    requestedToken.current = token;
    void fetch(apiUrl('/api/auth/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response) =>
        setMessage(
          response.ok
            ? 'Tài khoản đã được xác thực. Bạn có thể đăng nhập.'
            : 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.'
        )
      )
      .catch(() => setMessage('Không thể kết nối tới máy chủ. Hãy thử lại.'));
  }, [token]);

  return <StatusPage message={message} />;
}

function StatusPage({ message }: { message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card status-card">
        <p className="eyebrow">Cloud Bookstore</p>
        <h1>Trạng thái phiên</h1>
        <p role="status">{message}</p>
        <button className="secondary" onClick={() => navigate('/login')}>
          Đến trang đăng nhập
        </button>
      </section>
    </main>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="site-shell">
      <PublicHeader />
      <div className="page-content">{children}</div>
    </main>
  );
}

export default App;