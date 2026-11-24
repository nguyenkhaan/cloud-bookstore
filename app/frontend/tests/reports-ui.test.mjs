import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSrc = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

function readSourceTree(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory()
      ? readSourceTree(entryPath)
      : /\.(?:ts|tsx)$/.test(entry.name)
        ? [readFileSync(entryPath, 'utf8')]
        : []
  })
}

let server
let reportsRoutes
let reportsExport
let reportsPresentation
let sidebarModule

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  reportsRoutes = await server.ssrLoadModule('/src/features/reports/reports.route.ts')
  reportsExport = await server.ssrLoadModule('/src/features/reports/reports.export.ts')
  reportsPresentation = await server.ssrLoadModule('/src/features/reports/reports.presentation.ts')
  sidebarModule = await server.ssrLoadModule('/src/components/layout/Sidebar/Sidebar.tsx')
})

after(async () => {
  await server?.close()
})

test('reports routes and RBAC restrict /reports* to ADMIN only while /dashboard is open to authenticated roles', () => {
  assert.equal(reportsRoutes.reportsPaths.root, '/reports')
  assert.equal(reportsRoutes.reportsPaths.revenueExpense, '/reports/revenue-expense')
  assert.equal(reportsRoutes.reportsPaths.depositReconciliation, '/reports/deposit-reconciliation')
  assert.equal(reportsRoutes.reportsPaths.taxDeclaration, '/reports/tax-declaration')

  const appRoutes = readSrc('routes', 'AppRoutes.tsx')
  assert.match(appRoutes, /path=\{workspacePaths\.overview\} element=\{<RequireSession><RoleGuard screenId="dashboard"><DashboardRoute \/><\/RoleGuard><\/RequireSession>\}/)
  for (const [pathExpr, screenId] of [
    ['workspacePaths.reports', 'reports'],
    ['reportsPaths.revenueExpense', 'reportsRevenueExpense'],
    ['reportsPaths.depositReconciliation', 'reportsDepositReconciliation'],
    ['reportsPaths.taxDeclaration', 'reportsTaxDeclaration'],
  ]) {
    assert.match(
      appRoutes,
      new RegExp(`path=\\{${pathExpr}\\}[\\s\\S]*?<RequireSession>[\\s\\S]*?<RoleGuard screenId="${screenId}"`),
    )
  }

  assert.equal(sidebarModule.canAccessNavItem('reports', 'ADMIN'), true)
  assert.equal(sidebarModule.canAccessNavItem('reports', 'INVENTORY_MANAGER'), false)
  assert.equal(sidebarModule.canAccessNavItem('reports', 'CASHIER'), false)
  assert.equal(sidebarModule.canAccessNavItem('overview', 'CASHIER'), true)

  const reportsRootPage = readSrc('features', 'reports', 'pages', 'ReportsPage.tsx')
  assert.match(reportsRootPage, /Navigate replace to=\{reportsPaths\.revenueExpense\}/)
})

test('report charts use pure SVG without third-party chart or xlsx libraries', () => {
  const pkg = JSON.parse(readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'))
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  for (const forbidden of ['recharts', 'chart.js', 'apexcharts', 'echarts', 'xlsx', 'exceljs']) {
    assert.equal(allDeps[forbidden], undefined, `Unexpected external library: ${forbidden}`)
  }

  const dashboardPage = readSrc('features', 'dashboard', 'pages', 'DashboardPage.tsx')
  const dashTrend = readSrc('features', 'dashboard', 'components', 'RevenueTrendChart.tsx')
  const dashDonut = readSrc('features', 'dashboard', 'components', 'RevenueDonutChart.tsx')
  const repTrend = readSrc('features', 'reports', 'components', 'RevenueExpenseTrendChart.tsx')

  assert.match(dashboardPage, /useDashboardOverviewQuery/)
  assert.match(dashTrend, /<svg[\s\S]*?<polyline/)
  assert.match(dashDonut, /<svg[\s\S]*?strokeDasharray/)
  assert.match(repTrend, /<svg[\s\S]*?<polyline/)
})

test('report pages use the shared header tab bar and contain their required controls and print styling', () => {
  const rep02 = readSrc('features', 'reports', 'pages', 'RevenueExpenseReportPage.tsx')
  const rep03 = readSrc('features', 'reports', 'pages', 'DepositReconciliationPage.tsx')
  const rep04 = readSrc('features', 'reports', 'pages', 'TaxDeclarationReportPage.tsx')
  const mainLayout = readSrc('components', 'layout', 'MainLayout.tsx')
  const indexCss = readSrc('index.css')

  assert.match(rep02, /pageHeaderContent=\{<ReportsSubNav active="revenue-expense" \/>\}/)
  assert.match(rep02, /SourceDocumentsDrawer/)
  assert.match(rep02, /exportRevenueExpenseExcel/)

  assert.match(rep03, /pageHeaderContent=\{<ReportsSubNav active="deposit-reconciliation" \/>\}/)
  assert.match(rep03, /id="cash-actual-input"/)
  assert.match(rep03, /id="bank-actual-input"/)
  assert.match(rep03, /max\(0, Cọc − Khoản trừ\)/)
  assert.match(rep03, /exportDepositReconciliationExcel/)

  assert.match(rep04, /pageHeaderContent=\{<ReportsSubNav active="tax-declaration" \/>\}/)
  assert.match(rep04, /A\. Doanh thu chịu thuế/)
  assert.match(rep04, /B\. Chi phí đầu vào hợp lệ/)
  assert.match(rep04, /C\. Khoản loại trừ minh bạch - KHÔNG đưa vào thuế/)
  assert.match(rep04, /window\.print\(\)/)
  assert.match(mainLayout, /print:hidden/)
  assert.match(indexCss, /@media print/)
})

test('the shared UI has no screen-code property or visible report-code tabs', () => {
  const source = readSourceTree(path.join(frontendRoot, 'src')).join('\n')
  const reportTabs = readSrc('features', 'reports', 'components', 'ReportsSubNav.tsx')

  assert.doesNotMatch(source, /screenCode|(?:SCR|MOD)-[A-Z]+-\d{2}|DRAWER-[A-Z]+-\d{2}/)
  assert.match(reportTabs, /<nav[\s\S]*?overflow-x-auto border-b/)
  assert.doesNotMatch(reportTabs, /SCR-REP-/)
  assert.doesNotMatch(reportTabs, /rounded-2xl/)
})

test('OOXML .xlsx exporters produce valid ZIP workbooks and sanitize formula injection', () => {
  const bytes1 = reportsExport.buildRevenueExpenseXlsxBytes({
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    storeScopeLabel: 'Nhà sách Mây',
    totalRevenue: 106000000,
    totalExpense: 74850000,
    netOperatingDifference: 31150000,
    revenueBreakdown: {
      counterSales: 70000000,
      lostBookRetained: 2000000,
      settledRentFees: 28000000,
      settledExtensionFees: 3000000,
      settledPenalties: 3000000,
    },
    expenseBreakdown: {
      customerBuyback: 18000000,
      supplierImport: 26000000,
      approvedPayroll: 30850000,
      payrollPeriodCode: 'PAY-202609',
    },
    trendBuckets: [],
    sources: {
      items: [
        {
          sourceKey: 'SALE',
          sourceLabel: '=Bán sách',
          codePattern: 'HD-202609-*',
          quantityLabel: '10 hóa đơn',
          documentCount: 10,
          revenueAmount: 70000000,
          expenseAmount: null,
          paymentChannelLabel: 'Tiền mặt / VietQR',
          statusLabel: 'Đã hoàn tất',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    },
  })

  // PK\x03\x04 ZIP magic bytes
  assert.equal(bytes1[0], 0x50)
  assert.equal(bytes1[1], 0x4b)
  assert.equal(bytes1[2], 0x03)
  assert.equal(bytes1[3], 0x04)

  const decoded1 = new TextDecoder().decode(bytes1)
  assert.match(decoded1, /xl\/worksheets\/sheet1\.xml/)
  assert.match(decoded1, /&apos;=Bán sách/)
  assert.match(decoded1, /106000000/)

  const bytes2 = reportsExport.buildDepositReconciliationXlsxBytes(
    {
      fromDate: '2026-10-01',
      toDate: '2026-10-18',
      openingDepositBalance: 15000000,
      collectedInPeriod: 12000000,
      refundedInPeriod: 6000000,
      deductedFeeInPeriod: 1900000,
      lostRetainedInPeriod: 500000,
      deductedAndLostTotalInPeriod: 2400000,
      closingDepositBalance: 18600000,
      totalActiveObligationSlips: 1,
      cashObligationAmount: 8600000,
      bankObligationAmount: 10000000,
      suggestedCashActualBalance: 8500000,
      alertBannerMessage: null,
      slips: { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 },
    },
    [],
    8500000,
    10000000,
  )
  assert.equal(bytes2[0], 0x50)
  assert.equal(bytes2[1], 0x4b)

  const bytes3 = reportsExport.buildTaxDeclarationXlsxBytes({
    periodType: 'MONTH',
    year: 2026,
    periodValue: 9,
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    periodLabel: 'Tháng 09/2026',
    storeScopeLabel: 'Nhà sách Mây',
    generatedAtUtc: '2026-09-30T10:00:00Z',
    totalTaxableRevenue: 106000000,
    totalEligibleExpense: 74850000,
    netDifference: 31150000,
    hasFullSourceReconciliation: true,
    revenueItems: [
      {
        itemKey: 'SALE',
        title: 'Bán sách cũ tại quầy',
        recognitionRule: 'Hóa đơn bán thành công',
        sourceTrace: 'HD-202609-*',
        documentCount: 10,
        amount: 70000000,
      },
    ],
    expenseItems: [],
    excludedItems: [
      {
        itemKey: 'DEPOSIT_COLLECTED',
        title: 'Tiền cọc khách nộp khi thuê',
        amount: 24000000,
        treatmentNote: 'Nợ phải trả; không phải doanh thu',
      },
    ],
  })
  assert.equal(bytes3[0], 0x50)
  assert.equal(bytes3[1], 0x4b)
  const decoded3 = new TextDecoder().decode(bytes3)
  assert.match(decoded3, /A\. DOANH THU CHỊU THUẾ/)
  assert.match(decoded3, /Tiền cọc khách nộp khi thuê/)

  assert.equal(reportsPresentation.formatSignedVnd(-100000), '−100.000đ')
  assert.equal(reportsPresentation.formatSignedVnd(12000000, '+'), '+12.000.000đ')
})
