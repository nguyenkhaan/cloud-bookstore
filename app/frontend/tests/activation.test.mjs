import assert from 'node:assert/strict'
import test from 'node:test'
import { extractActivationToken } from '../src/features/auth/activation.ts'

const token = 'aaa.bbb-1.ccc_2'

test('a raw token is accepted as is', () => {
  assert.equal(extractActivationToken(`  ${token}\n`), token)
})

test('the token is extracted from a full activation link', () => {
  assert.equal(extractActivationToken(`http://localhost:5173/verify-email?token=${token}`), token)
})

test('the token is extracted from a relative path or a bare query', () => {
  assert.equal(extractActivationToken(`/verify-email?token=${token}`), token)
  assert.equal(extractActivationToken(`token=${token}`), token)
})

test('input without a well formed token is rejected', () => {
  assert.equal(extractActivationToken(''), null)
  assert.equal(extractActivationToken('xin chào'), null)
  assert.equal(extractActivationToken('http://localhost:5173/verify-email?token=abc'), null)
  assert.equal(extractActivationToken(undefined), null)
})
