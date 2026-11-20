import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

function readSource(...parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('POS transaction feature defines the requested screen contracts and customer-display route', () => {
  const routeSource = readSource('features', 'pos', 'pos.route.ts')
  const pageSource = readSource('features', 'pos', 'pages', 'PosWorkspacePage.tsx')
  const displayPageSource = readSource('features', 'pos', 'pages', 'PosCustomerDisplayPage.tsx')
  const fixtureSource = readSource('features', 'pos', 'pos-transaction.fixture.ts')

  for (const screenCode of ['SCR-POS-02', 'SCR-POS-03', 'SCR-POS-04', 'SCR-POS-05', 'SCR-POS-07', 'MOD-POS-01', 'MOD-POS-02']) {
    assert.match(`${pageSource}\n${displayPageSource}\n${fixtureSource}`, new RegExp(screenCode), `missing ${screenCode}`)
  }

  assert.match(routeSource, /customerDisplay/)
  assert.match(routeSource, /customerDisplay:\s+`\$\{posRoot\}\/customer-display`/)
  assert.match(`${pageSource}\n${fixtureSource}`, /Bán hàng|Cho thuê|Gia hạn|Trả & quyết toán/)
})

test('POS transaction mock stays local and preserves domain identifiers', () => {
  const featureSource = [
    readSource('features', 'pos', 'pos-transaction.type.ts'),
    readSource('features', 'pos', 'pos-transaction.fixture.ts'),
    readSource('features', 'pos', 'pages', 'PosWorkspacePage.tsx'),
    readSource('features', 'pos', 'pages', 'PosCustomerDisplayPage.tsx'),
  ].join('\n')

  assert.match(featureSource, /CopyBarcode/)
  assert.match(featureSource, /100%|actualSellingPrice|actual selling price/i)
  assert.match(featureSource, /Admin/)
  assert.match(featureSource, /fixture|mock/i)
  assert.doesNotMatch(featureSource, /axios|@tanstack\/react-query|fetch\(|\.service|\.hook/)
})

test('POS transaction fixture covers empty, invalid, pending, success, and insufficient-deposit states', () => {
  const fixtureSource = readSource('features', 'pos', 'pos-transaction.fixture.ts')

  for (const state of ['empty', 'invalid', 'pending', 'success', 'insufficient', 'damage']) {
    assert.match(fixtureSource, new RegExp(state, 'i'), `missing fixture state ${state}`)
  }
})

test('POS transaction UI does not expose internal mock or test controls', () => {
  const uiSource = [
    readSource('features', 'pos', 'components', 'PosRentalPanel.tsx'),
    readSource('features', 'pos', 'components', 'PosRenewalPanel.tsx'),
    readSource('features', 'pos', 'components', 'PosReturnPanel.tsx'),
    readSource('features', 'pos', 'components', 'PosSalePanel.tsx'),
    readSource('features', 'pos', 'components', 'PosPaymentPanel.tsx'),
    readSource('features', 'pos', 'components', 'PosCustomerDisplay.tsx'),
    readSource('features', 'pos', 'components', 'DamageReviewModal.tsx'),
    readSource('features', 'pos', 'components', 'QuickSeriesPickerModal.tsx'),
    readSource('features', 'pos', 'pages', 'PosWorkspacePage.tsx'),
  ].join('\n')

  for (const internalCopy of [
    'Trạng thái mock',
    'Trạng thái minh họa',
    'Tình huống kiểm thử',
    'mock UI',
    'QR fixture',
    'Mô phỏng thanh toán',
    'PIN mock',
    'OQ-004',
    'Hoàn tất mock',
    'Phí gia hạn fixture',
    'draft mock',
    'mức minh họa',
  ]) {
    assert.doesNotMatch(uiSource, new RegExp(internalCopy, 'i'), `internal UI copy leaked: ${internalCopy}`)
  }
})

test('rental eligibility warnings are derived from transaction data', () => {
  const rentalSource = readSource('features', 'pos', 'components', 'PosRentalPanel.tsx')
  const paymentSource = readSource('features', 'pos', 'components', 'PosPaymentPanel.tsx')

  assert.match(rentalSource, /rentalWarning/)
  assert.match(rentalSource, /Vượt hạn mức/)
  assert.match(rentalSource, /totalDeposit > 1_000_000/)
  assert.match(paymentSource, /disabledReason/)
})

test('POS UI keeps screen identifiers out of rendered components', () => {
  const uiSource = [
    readSource('features', 'pos', 'pages', 'PosWorkspacePage.tsx'),
    readSource('features', 'pos', 'components', 'QuickSeriesPickerModal.tsx'),
    readSource('features', 'pos', 'components', 'DamageReviewModal.tsx'),
    readSource('features', 'pos', 'components', 'PosCustomerDisplay.tsx'),
  ].join('\n')

  assert.doesNotMatch(uiSource, /screenCode\s*=/)
  assert.doesNotMatch(uiSource, /(?:SCR|MOD)-POS-\d{2}/)
})

test('payment panel shows an inline QR visual and rental changes its QR action label', () => {
  const paymentSource = readSource('features', 'pos', 'components', 'PosPaymentPanel.tsx')
  const rentalSource = readSource('features', 'pos', 'components', 'PosRentalPanel.tsx')

  assert.match(paymentSource, /QrCode/)
  assert.match(paymentSource, /method === 'cash'/)
  assert.doesNotMatch(paymentSource, /Mã QR thanh toán sẽ hiển thị trên màn hình phụ/)
  assert.doesNotMatch(paymentSource, /Quét mã VietQR|Thanh toán đúng số tiền hiển thị bên trên/)
  assert.match(rentalSource, /paymentMethod === 'vietqr' \? 'In phiếu thuê' : 'Xác nhận & In phiếu thuê'/)
})
