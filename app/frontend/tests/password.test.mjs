import assert from 'node:assert/strict'
import test from 'node:test'
import { getPasswordChecks, isPasswordAcceptable } from '../src/auth/password.js'

test('a password needs 12 to 128 characters, an uppercase letter, a digit and a symbol', () => {
  assert.equal(isPasswordAcceptable('Abcdefgh1234!'), true)
  assert.equal(isPasswordAcceptable('Abcdefg1!'), false)
  assert.equal(isPasswordAcceptable(`Aa1!${'x'.repeat(125)}`), false)
})

test('each rule is reported separately', () => {
  assert.deepEqual(getPasswordChecks('abcdefghijkl'), { length: true, upper: false, digit: false, special: false })
  assert.deepEqual(getPasswordChecks('ABCDEFGHIJK1!'), { length: true, upper: true, digit: true, special: true })
})

test('non string input never passes', () => {
  assert.equal(isPasswordAcceptable(undefined), false)
})
