import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSrc = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

let server
let auditRoutes
let auditPresentation
let sidebarModule

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  auditRoutes = await server.ssrLoadModule('/src/features/audit/audit.route.ts')
  auditPresentation = await server.ssrLoadModule('/src/features/audit/audit.presentation.ts')
  sidebarModule = await server.ssrLoadModule('/src/components/layout/Sidebar/Sidebar.tsx')
})

after(async () => {
  await server?.close()
})

test('audit routes and RBAC guards restrict /audit* to ADMIN and INVENTORY_MANAGER', () => {
  assert.equal(auditRoutes.auditPaths.root, '/audit')
  assert.equal(auditRoutes.auditPaths.copyLifecycle, '/audit/copy-lifecycle')

  const appRoutes = readSrc('routes', 'AppRoutes.tsx')
  assert.match(appRoutes, /path=\{workspacePaths\.audit\}[\s\S]*?<RequireSession>[\s\S]*?<RoleGuard screenId="audit">[\s\S]*?<AuditPage \/>/)
  assert.match(appRoutes, /path=\{auditPaths\.copyLifecycle\}[\s\S]*?<RequireSession>[\s\S]*?<RoleGuard screenId="auditCopyLifecycle">[\s\S]*?<CopyLifecycleLookupPage \/>/)

  assert.equal(sidebarModule.canAccessNavItem('audit', 'ADMIN'), true)
  assert.equal(sidebarModule.canAccessNavItem('audit', 'INVENTORY_MANAGER'), true)
  assert.equal(sidebarModule.canAccessNavItem('audit', 'CASHIER'), false)
})

test('audit presentation formats UTC+7 millisecond timestamps and summarizes JSON diffs', () => {
  const parts = auditPresentation.formatVnTimestampParts('2026-10-18T03:20:34.127Z')
  assert.equal(parts.date, '18/10/2026')
  assert.equal(parts.timeMs, '10:20:34.127')
  assert.equal(parts.isoOffset, '2026-10-18T10:20:34.127+07:00')

  assert.equal(auditPresentation.isBookCopyEntity('BookCopy'), true)
  assert.equal(auditPresentation.isBookCopyEntity('SaleInvoice'), false)
  assert.equal(auditPresentation.moduleDisplayLabel('BookCopy'), 'Kho')
  assert.equal(auditPresentation.moduleDisplayLabel('SaleInvoice'), 'POS')

  const summary = auditPresentation.summarizeTransition({
    id: '1',
    logCode: 'LOG-1',
    entityType: 'BookCopy',
    entityId: '11111111-1111-1111-1111-111111111111',
    entityLabel: 'BC-1092',
    action: 'UPDATE_PRICE',
    beforeData: JSON.stringify({ resalePrice: 75000 }),
    afterData: JSON.stringify({ resalePrice: 80000 }),
    reason: 'Điều chỉnh giá niêm yết',
    actorEmployeeId: null,
    actorName: 'Minh Anh',
    actorRole: 'ADMIN',
    ipAddress: '192.168.1.10',
    userAgent: 'Chrome/129.0 Windows NT 10.0',
    correlationId: 'req-1',
    occurredAt: '2026-10-18T03:20:34.127Z',
  })

  assert.equal(summary.target, 'BC-1092')
  assert.equal(summary.diff, '75000 → 80000')
})

test('audit is strictly read-only and copy lifecycle is integrated across Audit and Catalog pages', () => {
  const auditPage = readSrc('features', 'audit', 'pages', 'AuditPage.tsx')
  const lookupPage = readSrc('features', 'audit', 'pages', 'CopyLifecycleLookupPage.tsx')
  const editionPage = readSrc('features', 'catalog', 'pages', 'EditionDetailPage.tsx')
  const copyPage = readSrc('features', 'catalog', 'pages', 'CopyDetailPage.tsx')
  const drawer = readSrc('features', 'catalog', 'components', 'BookCopyLifecycleDrawer.tsx')

  assert.match(auditPage, /Read-only · Không sửa \/ xóa/)
  assert.match(auditPage, /AuditTable/)
  assert.match(auditPage, /AuditDetailPanel/)
  assert.match(auditPage, /AuditRelatedTimeline/)
  assert.match(auditPage, /BookCopyLifecycleDrawer/)

  assert.match(lookupPage, /vòng đời 360°/)
  assert.match(lookupPage, /getCopyByBarcode/)
  assert.match(lookupPage, /BookCopyLifecycleDrawer/)

  assert.match(editionPage, /BookCopyLifecycleDrawer/)
  assert.doesNotMatch(copyPage, /BookCopyLifecycleDrawer/)
  assert.match(drawer, /In lại tem dán gáy/)
  assert.match(drawer, /Chuyển vị trí kệ/)
})
