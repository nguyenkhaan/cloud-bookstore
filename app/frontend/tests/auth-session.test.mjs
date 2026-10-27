import assert from 'node:assert/strict'
import test from 'node:test'
import { getRouteDecision, getSafeNextPath, isAccessTokenUsable } from '../src/features/auth/session.ts'

function tokenWithExpiration(expirationInSeconds) {
  const payload = Buffer.from(JSON.stringify({ exp: expirationInSeconds })).toString('base64url')
  return `header.${payload}.signature`
}

test('an expired access token is not usable', () => {
  const expiredToken = tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)

  assert.equal(isAccessTokenUsable(expiredToken), false)
})

test('a protected route with an expired token redirects to login and preserves the destination', () => {
  const expiredToken = tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)

  assert.deepEqual(
    getRouteDecision('/dashboard', '?tab=today', expiredToken),
    { type: 'redirect', to: '/login?next=%2Fdashboard%3Ftab%3Dtoday' },
  )
})

test('public catalog remains viewable but checkout requires a usable access token', () => {
  const expiredToken = tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)

  assert.deepEqual(getRouteDecision('/catalog', '', expiredToken), { type: 'allow' })
  assert.deepEqual(
    getRouteDecision('/checkout', '', expiredToken),
    { type: 'redirect', to: '/login?next=%2Fcheckout' },
  )
})

test('only local application paths are accepted as a post-login destination', () => {
  assert.equal(getSafeNextPath('/dashboard?tab=today'), '/dashboard?tab=today')
  assert.equal(getSafeNextPath('https://example.com/phishing'), '/dashboard')
  assert.equal(getSafeNextPath('//example.com/phishing'), '/dashboard')
  assert.equal(getSafeNextPath(null), '/dashboard')
})
