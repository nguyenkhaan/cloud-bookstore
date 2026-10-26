import assert from 'node:assert/strict'
import test from 'node:test'
import { getRouteDecision, isAccessTokenUsable } from '../src/auth/session.js'

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
