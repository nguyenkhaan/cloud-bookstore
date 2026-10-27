type RouteDecision =
  | { type: 'allow' }
  | { type: 'redirect'; to: string }

const PUBLIC_PATHS = new Set(['/login', '/activate', '/verify-email', '/catalog'])

export function getSafeNextPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

export function getRouteDecision(pathname: string, search: string, isAuthenticated = false): RouteDecision {
  if (PUBLIC_PATHS.has(pathname) || isAuthenticated) return { type: 'allow' }
  return { type: 'redirect', to: `/login?next=${encodeURIComponent(`${pathname}${search}`)}` }
}
