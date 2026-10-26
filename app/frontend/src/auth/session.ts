export interface TokenPayload {
  exp?: number;
  [key: string]: unknown;
}

export type RouteDecision =
  | { type: 'allow' }
  | { type: 'redirect'; to: string };

const protectedRoutes: RegExp[] = [
  /^\/dashboard(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/inventory\/new(?:\/|$)/,
  /^\/inventory\/[^/]+\/edit(?:\/|$)/,
];

function decodeTokenPayload(accessToken: unknown): TokenPayload | null {
  if (typeof accessToken !== 'string') return null;

  const [, encodedPayload] = accessToken.split('.');
  if (!encodedPayload) return null;

  try {
    const paddedPayload = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    return JSON.parse(atob(paddedPayload)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenUsable(accessToken: unknown, now: number = Date.now()): boolean {
  const payload = decodeTokenPayload(accessToken);
  return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) && payload.exp * 1000 > now;
}

export function getRouteDecision(
  pathname: string,
  search: string,
  accessToken: unknown
): RouteDecision {
  const isProtectedRoute = protectedRoutes.some((route) => route.test(pathname));
  if (!isProtectedRoute || isAccessTokenUsable(accessToken)) return { type: 'allow' };

  const destination = `${pathname}${search}`;
  return { type: 'redirect', to: `/login?next=${encodeURIComponent(destination)}` };
}

export function getAccessTokenExpiration(accessToken: unknown): number | null {
  const payload = decodeTokenPayload(accessToken);
  return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
}

export function getSafeNextPath(candidate: unknown): string {
  return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/dashboard';
}

