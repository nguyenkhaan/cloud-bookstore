import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const frontendRoot = resolve(import.meta.dirname, '..')
const readSource = (...parts) => readFileSync(join(frontendRoot, 'src', ...parts), 'utf8')
let viteServer
let barcodeLabelsModule

before(async () => {
  viteServer = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  barcodeLabelsModule = await viteServer.ssrLoadModule('/src/components/common/BarcodeLabel/barcode-labels-print.ts')
})

after(async () => {
  await viteServer?.close()
})

test('audit page removes unused icon and role derivation', () => {
  const source = readSource('features', 'audit', 'pages', 'AuditPage.tsx')
  assert.doesNotMatch(source, /\bInfo\b/)
  assert.doesNotMatch(source, /isInventoryManager/)
})

test('dashboard page removes unused formatter imports', () => {
  const source = readSource('features', 'dashboard', 'pages', 'DashboardPage.tsx')
  assert.doesNotMatch(source, /\bInfo\b/)
  assert.doesNotMatch(source, /formatVnDate(?:Short|TimeShort)/)
})

test('catalog and tax report remove unused imports', () => {
  const copyDetail = readSource('features', 'catalog', 'pages', 'CopyDetailPage.tsx')
  const taxReport = readSource('features', 'reports', 'pages', 'TaxDeclarationReportPage.tsx')
  assert.doesNotMatch(copyDetail, /BookCopyLifecycleDrawer/)
  assert.doesNotMatch(taxReport, /\bInfo\b/)
})

test('printed label prices normalize missing values before formatVnd', () => {
  const drawer = readSource('features', 'catalog', 'components', 'BookCopyLifecycleDrawer.tsx')
  assert.match(drawer, /formatVnd\(printedLabel\.sellingPrice \?\? null\)/)
  assert.match(drawer, /formatVnd\(printedLabel\.rentalRate \?\? null\)/)
})

test('barcode print markup escapes untrusted text values', () => {
  assert.equal(
    barcodeLabelsModule.escapePrintHtml(`<img src=x onerror="alert('xss')">`),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;',
  )
})

test('barcode label CSV treats formula prefixes as literal text', () => {
  const csv = barcodeLabelsModule.buildBarcodeLabelsCsvContent([
    {
      barcode: '=2+2',
      titleName: '+SUM(A1:A2), "Sách"',
      grade: '@danger',
      sellingPrice: 125000,
    },
  ])

  assert.match(csv, /^CopyBarcode,TenSach,Grade,GiaBanVND\n/)
  assert.match(csv, /'=2\+2/)
  assert.match(csv, /"'\+SUM\(A1:A2\), ""Sách"""/)
  assert.match(csv, /'@danger/)
})

test('account forms and device actions use live mutations instead of mock state', () => {
  const firstChange = readSource('features', 'auth', 'pages', 'FirstChangePasswordPage.tsx')
  const changeModal = readSource('features', 'auth', 'components', 'ChangePasswordModal.tsx')
  const profile = readSource('features', 'auth', 'pages', 'ProfileSecurityPage.tsx')

  assert.doesNotMatch(firstChange, /setTimeout|mật khẩu tạm/i)
  assert.match(firstChange, /<ChangePasswordForm/)
  assert.match(firstChange, /to="\/dashboard"/)

  assert.match(changeModal, /useChangePasswordMutation\(/)
  assert.match(changeModal, /await mutateAsync\(\{ currentPassword, newPassword \}\)/)
  assert.match(changeModal, /localizeAuthError\(/)

  assert.doesNotMatch(profile, /auth\.mock|setDevices\(|Tên đăng nhập|Ca làm việc mặc định|Tùy chọn thông báo/)
  assert.match(profile, /useUpdateProfileMutation\(/)
  assert.match(profile, /uploadImage\('EMPLOYEE_AVATAR', file\)/)
  assert.match(profile, /useRevokeOtherSessionsMutation\(/)
})
