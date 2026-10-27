import { useEffect } from 'react';
import { getRouteDecision } from '@/tmp/auth/session';
import { useAuth } from '@/tmp/hooks/useAuth';
import { ActivateAccountPage } from '@/tmp/pages/ActivateAccount/ActivateAccountPage';
import {
  Catalog,
  Checkout,
  ForgotPasswordPage,
  Home,
  InventoryEditor,
  ResetPasswordPage,
  StatusPage,
} from '@/tmp/pages/legacy/LegacyPages';
import { DashboardPage } from '@/tmp/pages/Dashboard/DashboardPage';
import { LoginPage } from '@/tmp/pages/Login/LoginPage';
import { navigate, useLocation } from '@/tmp/routes/router';

export function AppRoutes() {
  const { pathname, search } = useLocation();
  const { session, signOut } = useAuth();
  const decision = getRouteDecision(pathname, search, session?.accessToken);
  const redirectTo = decision.type === 'redirect' && typeof decision.to === 'string' ? decision.to : null;

  useEffect(() => {
    if (redirectTo) navigate(redirectTo, true);
  }, [redirectTo]);

  if (decision.type === 'redirect') {
    return <StatusPage message="Phiên đăng nhập đã hết hạn. Đang chuyển đến trang đăng nhập…" />;
  }

  if (pathname === '/login') return <LoginPage search={search} />;
  if (pathname === '/activate' || pathname === '/verify-email') return <ActivateAccountPage search={search} />;
  if (pathname === '/forgot-password') return <ForgotPasswordPage />;
  if (pathname === '/reset-password') return <ResetPasswordPage search={search} />;
  if (pathname === '/dashboard') return <DashboardPage onSignOut={signOut} />;
  if (pathname === '/checkout') return <Checkout />;
  if (pathname === '/inventory/new' || /^\/inventory\/[^/]+\/edit$/.test(pathname)) return <InventoryEditor />;
  if (pathname === '/catalog') return <Catalog />;
  return <Home />;
}
