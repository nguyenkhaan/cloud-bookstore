const protectedRoutes = [
  /^\/dashboard(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/inventory\/new(?:\/|$)/,
  /^\/inventory\/[^/]+\/edit(?:\/|$)/,
]

function decodeTokenPayload(accessToken) {
  if (typeof accessToken !== 'string') return null

  const [, encodedPayload] = accessToken.split('.')
  if (!encodedPayload) return null

  try {
    const paddedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
    return JSON.parse(atob(paddedPayload))
  } catch {
    return null
  }
}

export function isAccessTokenUsable(accessToken, now = Date.now()) {
  const payload = decodeTokenPayload(accessToken)
  return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) && payload.exp * 1000 > now
}

export function getRouteDecision(pathname, search, accessToken) {
  const isProtectedRoute = protectedRoutes.some((route) => route.test(pathname))
  if (!isProtectedRoute || isAccessTokenUsable(accessToken)) return { type: 'allow' }

  const destination = `${pathname}${search}`
  return { type: 'redirect', to: `/login?next=${encodeURIComponent(destination)}` }
}

export function getAccessTokenExpiration(accessToken) {
  const payload = decodeTokenPayload(accessToken)
  return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null
}

export function getSafeNextPath(candidate) {
  return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/dashboard'
}
