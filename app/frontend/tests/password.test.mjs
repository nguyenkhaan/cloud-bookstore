import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let passwordRules
let server

const validPassword = ['Abcdefgh', '1234', '!'].join('')
const tooShortPassword = ['Abcdefg', '1', '!'].join('')
const tooLongPassword = ['Aa', '1', '!', 'x'.repeat(125)].join('')
const uppercasePassword = ['ABCDEFGHIJK', '1', '!'].join('')

before(async () => {
  server = await createServer({ appType: 'custom', server: { hmr: false, middlewareMode: true } })
  passwordRules = await server.ssrLoadModule('/src/features/auth/components/PasswordRules.tsx')
})

after(async () => {
  await server?.close()
})

test('a password needs 12 to 128 characters, an uppercase letter, a digit and a symbol', () => {
  assert.equal(passwordRules.isPasswordAcceptable(validPassword), true)
  assert.equal(passwordRules.isPasswordAcceptable(tooShortPassword), false)
  assert.equal(passwordRules.isPasswordAcceptable(tooLongPassword), false)
})

test('each rule is reported separately', () => {
  assert.deepEqual(passwordRules.getPasswordChecks('abcdefghijkl'), { length: true, upper: false, digit: false, special: false })
  assert.deepEqual(passwordRules.getPasswordChecks(uppercasePassword), { length: true, upper: true, digit: true, special: true })
})

test('non string input never passes', () => {
  assert.equal(passwordRules.isPasswordAcceptable(undefined), false)
})
