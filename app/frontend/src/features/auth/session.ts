type RouteDecision =
  | { type: 'allow' }
  | { type: 'redirect'; to: string }

const PUBLIC_PATHS = new Set(['/login', '/activate', '/verify-email', '/catalog'])

export function getAccessTokenExpiration(token?: string): number | null {
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as unknown
    if (typeof decoded !== 'object' || decoded === null || !('exp' in decoded) || typeof decoded.exp !== 'number') {
      return null
    }
    return decoded.exp * 1000
  } catch {
    return null
  }
}

export function isAccessTokenUsable(token?: string): boolean {
  const expiration = getAccessTokenExpiration(token)
  return expiration !== null && expiration > Date.now()
}

export function getSafeNextPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

export function getRouteDecision(pathname: string, search: string, accessToken?: string): RouteDecision {
  if (PUBLIC_PATHS.has(pathname) || isAccessTokenUsable(accessToken)) return { type: 'allow' }
  return { type: 'redirect', to: `/login?next=${encodeURIComponent(`${pathname}${search}`)}` }
}
