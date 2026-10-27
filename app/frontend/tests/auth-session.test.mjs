import assert from 'node:assert/strict'
import test from 'node:test'
import { getRouteDecision, getSafeNextPath } from '../src/features/auth/session.ts'

test('a protected route without a restored cookie session redirects to login and preserves the destination', () => {
  assert.deepEqual(
    getRouteDecision('/dashboard', '?tab=today', false),
    { type: 'redirect', to: '/login?next=%2Fdashboard%3Ftab%3Dtoday' },
  )
})

test('public catalog remains viewable but checkout requires a restored cookie session', () => {
  assert.deepEqual(getRouteDecision('/catalog', '', false), { type: 'allow' })
  assert.deepEqual(
    getRouteDecision('/checkout', '', false),
    { type: 'redirect', to: '/login?next=%2Fcheckout' },
  )
})

test('a restored cookie session can view protected routes without decoding a JWT', () => {
  assert.deepEqual(getRouteDecision('/dashboard', '', true), { type: 'allow' })
})

test('only local application paths are accepted as a post-login destination', () => {
  assert.equal(getSafeNextPath('/dashboard?tab=today'), '/dashboard?tab=today')
  assert.equal(getSafeNextPath('https://example.com/phishing'), '/dashboard')
  assert.equal(getSafeNextPath('//example.com/phishing'), '/dashboard')
  assert.equal(getSafeNextPath(null), '/dashboard')
})
