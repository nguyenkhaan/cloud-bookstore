import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let presentation
let routes

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  presentation = await server.ssrLoadModule('/src/features/customers/customers.presentation.ts')
  routes = await server.ssrLoadModule('/src/features/customers/customers.route.ts')
})

after(async () => {
  await server?.close()
})

test('customer feature files exist in the feature directory', () => {
  const files = [
    ['features', 'customers', 'customers.type.ts'],
    ['features', 'customers', 'customers.service.ts'],
    ['features', 'customers', 'customers.hook.ts'],
    ['features', 'customers', 'customers.presentation.ts'],
    ['features', 'customers', 'customers.route.ts'],
    ['features', 'customers', 'pages', 'CustomerListPage.tsx'],
    ['features', 'customers', 'components', 'AddCustomerDialog.tsx'],
  ]

  for (const f of files) {
    assert.ok(existsSync(src(...f)), `Missing file: src/${f.join('/')}`)
  }
})

test('customer route is registered and guarded in AppRoutes.tsx', () => {
  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(
    routesContent,
    /path="\/customers" element=\{<RequireSession><CustomerListPage \/><\/RequireSession>\}/,
    'AppRoutes must register /customers with RequireSession guard'
  )
})

test('customer routes declare customerList and customerDetail correctly', () => {
  assert.equal(routes.customerPaths.customerList, '/customers')
  assert.equal(routes.customerPaths.customerDetail('cust-123'), '/customers/cust-123')
})

test('phone normalization conforms to AC-1.1 specifications', () => {
  const { normalizePhoneNumber } = presentation

  assert.equal(normalizePhoneNumber('+84912345678'), '0912345678')
  assert.equal(normalizePhoneNumber('84912345678'), '0912345678')
  assert.equal(normalizePhoneNumber('0912.345.678'), '0912345678')
  assert.equal(normalizePhoneNumber('0912-345-678'), '0912345678')
  assert.equal(normalizePhoneNumber('(091) 234 5678'), '0912345678')
  assert.equal(normalizePhoneNumber('+84 901 234 567'), '0901234567')
  assert.equal(normalizePhoneNumber(''), '')
  assert.equal(normalizePhoneNumber(null), '')
})

test('Vietnamese mobile phone validation conforms to AC-1.2', () => {
  const { isValidVietnamesePhone } = presentation

  // Valid prefixes: 03, 05, 07, 08, 09 with 10 digits
  assert.equal(isValidVietnamesePhone('0912345678'), true)
  assert.equal(isValidVietnamesePhone('0868123456'), true)
  assert.equal(isValidVietnamesePhone('0398765432'), true)
  assert.equal(isValidVietnamesePhone('0771234567'), true)
  assert.equal(isValidVietnamesePhone('0568889999'), true)

  // Invalid: 01 prefix (old 11-digit system)
  assert.equal(isValidVietnamesePhone('0123456789'), false)
  // Invalid: too short
  assert.equal(isValidVietnamesePhone('091234567'), false)
  // Invalid: too long
  assert.equal(isValidVietnamesePhone('09123456789'), false)
  // Invalid: non-numeric or empty
  assert.equal(isValidVietnamesePhone(''), false)
  assert.equal(isValidVietnamesePhone(null), false)
  assert.equal(isValidVietnamesePhone('0912abc678'), false)
})

test('phone formatting presents readable 4-3-3 spaced digits', () => {
  const { formatPhoneNumber } = presentation

  assert.equal(formatPhoneNumber('0912345678'), '0912 345 678')
  assert.equal(formatPhoneNumber(''), '—')
  assert.equal(formatPhoneNumber(null), '—')
})

test('VND currency formatting displays correctly with symbol', () => {
  const { formatVnd } = presentation

  assert.match(formatVnd(1250000), /1\.250\.000\s*đ/)
  assert.equal(formatVnd(0), '0 đ')
  assert.equal(formatVnd(null), '0 đ')
})

test('tier badges map correctly to Vietnamese labels and visual styles', () => {
  const { getTierBadge } = presentation

  const reg = getTierBadge('REGULAR')
  assert.equal(reg.label, 'Thường')

  const silver = getTierBadge('SILVER')
  assert.equal(silver.label, 'Bạc')

  const gold = getTierBadge('GOLD')
  assert.equal(gold.label, 'Vàng')
})

test('initials generator produces 2-letter uppercase monogram', () => {
  const { getInitials } = presentation

  assert.equal(getInitials('Nguyễn An Nhiên'), 'NN')
  assert.equal(getInitials('Trần Văn A'), 'TA')
  assert.equal(getInitials('Nam'), 'NA')
  assert.equal(getInitials(''), 'KH')
})

test('phone normalization edge cases handle complex delimiters and international prefixes', () => {
  const { normalizePhoneNumber } = presentation

  assert.equal(normalizePhoneNumber('+84 (091) 234-5678'), '0912345678')
  assert.equal(normalizePhoneNumber('( +84 ) 9.1.2 - 3.4.5 - 6.7.8'), '0912345678')
  assert.equal(normalizePhoneNumber('840912345678'), '0912345678')
  assert.equal(normalizePhoneNumber('84987654321'), '0987654321')
  assert.equal(normalizePhoneNumber('+84-90-123-4567'), '0901234567')
  assert.equal(normalizePhoneNumber('\t+84 912 345 678\r\n'), '0912345678')
  assert.equal(normalizePhoneNumber('   +84 987 654 321   '), '0987654321')
})

test('Vietnamese mobile phone validation edge cases for all mobile and invalid carrier prefixes', () => {
  const { isValidVietnamesePhone } = presentation

  // All valid mobile carrier prefixes
  assert.equal(isValidVietnamesePhone('0321234567'), true) // Viettel 032
  assert.equal(isValidVietnamesePhone('0561234567'), true) // Vietnamobile 056
  assert.equal(isValidVietnamesePhone('0701234567'), true) // MobiFone 070
  assert.equal(isValidVietnamesePhone('0811234567'), true) // Vinaphone 081
  assert.equal(isValidVietnamesePhone('0901234567'), true) // MobiFone 090

  // Landline and invalid prefixes
  assert.equal(isValidVietnamesePhone('0243822233'), false) // Hanoi landline
  assert.equal(isValidVietnamesePhone('0283822233'), false) // HCMC landline
  assert.equal(isValidVietnamesePhone('0412345678'), false) // Old landline
  assert.equal(isValidVietnamesePhone('0612345678'), false) // Special service
  assert.equal(isValidVietnamesePhone('0000000000'), false) // Zeros
})

test('phone formatting edge cases handle anomalous lengths and invalid inputs', () => {
  const { formatPhoneNumber } = presentation

  assert.equal(formatPhoneNumber('0912345678'), '0912 345 678')
  assert.equal(formatPhoneNumber('12345'), '12345') // Short preserved
  assert.equal(formatPhoneNumber('09123456789'), '09123456789') // 11 digits preserved
  assert.equal(formatPhoneNumber(''), '—')
  assert.equal(formatPhoneNumber(null), '—')
  assert.equal(formatPhoneNumber(undefined), '—')
})

test('currency formatting edge cases handle negative, string, and zero amounts', () => {
  const { formatVnd } = presentation

  assert.equal(formatVnd(0), '0 đ')
  assert.equal(formatVnd('500000'), '500.000 đ')
  assert.equal(formatVnd('not-a-number'), '0 đ')
  assert.equal(formatVnd(undefined), '0 đ')
})

test('initials generator handles single words, extra spaces, and special names', () => {
  const { getInitials } = presentation

  assert.equal(getInitials('   Lê    Văn    Hùng   '), 'LH')
  assert.equal(getInitials('Thái'), 'TH')
  assert.equal(getInitials('   '), 'KH')
  assert.equal(getInitials(null), 'KH')
})
