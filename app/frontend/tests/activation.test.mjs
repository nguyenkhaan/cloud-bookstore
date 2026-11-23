import assert from 'node:assert/strict'
import test from 'node:test'
import { getVerificationToken } from '../src/features/auth/verification.ts'

const token = 'aaa.bbb-1.ccc_2'

test('the verification token is read from the email-link query string', () => {
  assert.equal(getVerificationToken(`?token=${token}`), token)
})

test('the verification token is URL-decoded from the email-link query string', () => {
  assert.equal(getVerificationToken(`?token=${encodeURIComponent(token)}`), token)
})

test('missing or malformed query tokens never trigger verification', () => {
  assert.equal(getVerificationToken(''), null)
  assert.equal(getVerificationToken('?token=abc'), null)
  assert.equal(getVerificationToken('?token=invalid token'), null)
})
