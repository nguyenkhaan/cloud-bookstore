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

const unicodeCases = [
  ['NEL is whitespace, not a symbol', 'Aabcdefghij1\u0085', { special: false }],
  ['BOM is the only symbol', 'Aabcdefghij1\uFEFF', {}],
  ['supplementary letter is the only uppercase', '\u{1D400}abcdefghi1!', {}],
  ['supplementary letter cannot be used as a symbol', '\u{1D400}abcdefghij1', { special: false }],
  ['supplementary letter counts once below the minimum', '\u{1D400}abcdefgh1!', { length: false }],
  ['128 scalars can span more than 128 UTF-16 units', `\u{1D400}${'a'.repeat(125)}1!`, {}],
  ['supplementary lowercase letter cannot be used as uppercase', 'abcdefghij\u{10428}1!', { upper: false }],
]

for (const [label, password, overrides] of unicodeCases) {
  test(label, () => {
    assert.deepEqual(passwordRules.getPasswordChecks(password), {
      length: true,
      upper: true,
      digit: true,
      special: true,
      ...overrides,
    })
    assert.equal(passwordRules.isPasswordAcceptable(password), Object.keys(overrides).length === 0)
  })
}

test('non string input never passes', () => {
  assert.equal(passwordRules.isPasswordAcceptable(undefined), false)
})
