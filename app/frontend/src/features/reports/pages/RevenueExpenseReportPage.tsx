import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Info, RotateCcw, Search } from 'lucide-react'
import { Badge, Button, Card, SelectBox, StatCard } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { ReportsSubNav } from '../components/ReportsSubNav'
import { RevenueExpenseTrendChart } from '../components/RevenueExpenseTrendChart'
import { SourceDocumentsDrawer } from '../components/SourceDocumentsDrawer'
import { exportRevenueExpenseExcel } from '../reports.export'
import { useRevenueExpenseReportQuery } from '../reports.hook'
import { formatVnDateShort, formatVnd, getCurrentVnMonthRange, toNumber } from '../reports.presentation'
import type {
  PaymentMethodFilter,
  RevenueExpenseFilters,
  RevenueExpenseSourceRow,
} from '../reports.type'

const SOURCE_OPTIONS = [
  { value: '', label: 'Nguồn: Tất cả' },
  { value: 'SALE', label: 'Bán sách tại quầy' },
  { value: 'LOST_BOOK', label: 'Cọc mất sách → Doanh thu bán' },
  { value: 'RENTAL_FEE', label: 'Phí thuê đã quyết toán' },
  { value: 'EXTENSION', label: 'Gia hạn đã quyết toán' },
  { value: 'PENALTY', label: 'Tiền phạt trễ / Hư hỏng' },
  { value: 'BUYBACK', label: 'Thu mua sách cũ' },
  { value: 'SUPPLIER_IMPORT', label: 'Nhập hàng NCC / NXB' },
  { value: 'PAYROLL', label: 'Lương đã duyệt' },
]

export default function RevenueExpenseReportPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const defaultPeriod = useMemo(() => getCurrentVnMonthRange(), [])

  const [fromDate, setFromDate] = useState(defaultPeriod.from)
  const [toDate, setToDate] = useState(defaultPeriod.to)
  const [source, setSource] = useState('')
  const [method, setMethod] = useState<PaymentMethodFilter | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [drawerSource, setDrawerSource] = useState<RevenueExpenseSourceRow | null>(null)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  const filters = useMemo<RevenueExpenseFilters>(
    () => ({
      from: fromDate || undefined,
      to: toDate || undefined,
      source: source || undefined,
      method: method || undefined,
      search: debouncedSearch || undefined,
      page,
      pageSize: 10,
    }),
    [fromDate, toDate, source, method, debouncedSearch, page],
  )

  const reportQuery = useRevenueExpenseReportQuery(filters)
  const data = reportQuery.data

  const sources = data?.sources?.items ?? []
  const totalSources = toNumber(data?.sources?.totalCount)
  const totalPages = Math.max(1, toNumber(data?.sources?.totalPages) || 1)

  const handleReset = () => {
    setFromDate(defaultPeriod.from)
    setToDate(defaultPeriod.to)
    setSource('')
    setMethod('')
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
  }

  return (
    <MainLayout
      currentPath="reports"
      onNavigate={(id) => {
        const target = workspacePathFor(id)
        if (target) navigate(target)
      }}
      onSignOut={signOut}
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Báo cáo & thuế' },
        { label: 'Báo cáo Doanh thu & Chi phí đa nguồn' },
      ]}
      pageTitle="Báo cáo Doanh thu & Chi phí đa nguồn"
      pageHeaderContent={<ReportsSubNav active="revenue-expense" />}
      actionButton={
        <Button
          type="button"
          onClick={() => data && exportRevenueExpenseExcel(data)}
          disabled={!data}
          className="min-h-10"
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Xuất Excel (.xlsx)
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Filter Card */}
        <Card padding="sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="relative xl:col-span-4">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="rep02-search" className="sr-only">
                Tìm mã giao dịch hoặc chứng từ
              </label>
              <input
                id="rep02-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã giao dịch / chứng từ..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 xl:col-span-4">
              <div>
                <label htmlFor="rep02-from" className="sr-only">
                  Từ ngày
                </label>
                <input
                  id="rep02-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Từ ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="rep02-to" className="sr-only">
                  Đến ngày
                </label>
                <input
                  id="rep02-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Đến ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="xl:col-span-2">
              <SelectBox
                label="Nguồn giao dịch"
                hideLabel
                value={source}
                onChange={(val) => {
                  setSource(val)
                  setPage(1)
                }}
                options={SOURCE_OPTIONS}
              />
            </div>

            <div className="flex gap-2 xl:col-span-2">
              <SelectBox
                label="Hình thức thanh toán"
                hideLabel
                searchable={false}
                className="min-w-0 flex-1"
                value={method}
                onChange={(val) => {
                  setMethod(val as PaymentMethodFilter | '')
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Thanh toán: Tất cả' },
                  { value: 'CASH', label: 'Tiền mặt' },
                  { value: 'BANK_TRANSFER', label: 'Chuyển khoản / VietQR' },
                ]}
              />
              <button
                type="button"
                onClick={handleReset}
                title="Đặt lại bộ lọc"
                aria-label="Đặt lại bộ lọc"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Card>

        {reportQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {reportQuery.error instanceof Error
              ? reportQuery.error.message
              : 'Không thể tải báo cáo doanh thu và chi phí.'}
          </div>
        )}

        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Doanh thu đã ghi nhận"
            value={formatVnd(data?.totalRevenue)}
            valueColor="emerald"
            description="Không gồm cọc nhận / hoàn"
          />
          <StatCard
            label="Chi phí đa nguồn"
            value={formatVnd(data?.totalExpense)}
            valueColor="amber"
            description="Thu mua + NCC + lương đã duyệt"
          />
          <StatCard
            label="Chênh lệch hoạt động"
            value={formatVnd(data?.netOperatingDifference)}
            valueColor="indigo"
            description="Doanh thu − Chi phí"
          />
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card title="Cơ cấu doanh thu" className="lg:col-span-7">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Bán sách tại quầy</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.revenueBreakdown?.counterSales)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Cọc mất sách → Doanh thu bán</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.revenueBreakdown?.lostBookRetained)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Phí thuê đã quyết toán</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.revenueBreakdown?.settledRentFees)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Gia hạn đã quyết toán</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.revenueBreakdown?.settledExtensionFees)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Tiền phạt trễ / Hư hỏng</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.revenueBreakdown?.settledPenalties)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-[11px] text-indigo-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
              <span>
                Cọc mất sách chỉ ghi nhận một lần vào doanh thu bán; không thu phí thuê / trễ cho cuốn mất.
              </span>
            </div>
          </Card>

          <Card title="Cơ cấu chi phí" className="lg:col-span-5">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Thu mua sách cũ từ cá nhân</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.expenseBreakdown?.customerBuyback)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Nhập hàng NCC / NXB</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.expenseBreakdown?.supplierImport)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">
                  Lương đã duyệt · {data?.expenseBreakdown?.payrollPeriodCode || 'Kỳ hiện tại'}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(data?.expenseBreakdown?.approvedPayroll)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-900">
                <span>Tổng chi phí</span>
                <span>{formatVnd(data?.totalExpense)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[11px] text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Chi phí được tổng hợp theo chứng từ hợp lệ. Bảng lương nháp, phiếu nhập chưa hoàn tất không được tính.
              </span>
            </div>
          </Card>
        </div>

        {/* Trend Chart */}
        <RevenueExpenseTrendChart
          buckets={data?.trendBuckets ?? []}
          totalRevenue={data?.totalRevenue ?? 0}
          totalExpense={data?.totalExpense ?? 0}
        />

        {/* Source Summary Table */}
        <Card
          title="Giao dịch theo nguồn"
        >
          {reportQuery.isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
              Không tìm thấy nguồn giao dịch nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[740px] w-full text-left text-xs">
                <thead>
                  <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                    <th className="px-4 py-3 font-semibold first:rounded-l-xl">Nguồn / Chứng từ</th>
                    <th className="px-4 py-3 font-semibold">Số lượng</th>
                    <th className="px-4 py-3 font-semibold">Doanh thu</th>
                    <th className="px-4 py-3 font-semibold">Chi phí</th>
                    <th className="px-4 py-3 font-semibold">Thanh toán</th>
                    <th className="px-4 py-3 font-semibold last:rounded-r-xl">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((row) => (
                    <tr
                      key={row.sourceKey}
                      onClick={() => setDrawerSource(row)}
                      className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDrawerSource(row)
                          }}
                          className="text-left hover:text-indigo-700 cursor-pointer"
                        >
                          {row.sourceLabel} · <span className="font-mono">{row.codePattern}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{row.quantityLabel}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {row.revenueAmount !== null && row.revenueAmount !== undefined
                          ? formatVnd(row.revenueAmount)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {row.expenseAmount !== null && row.expenseAmount !== undefined
                          ? formatVnd(row.expenseAmount)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{row.paymentChannelLabel}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="neutral" size="xs">
                          {row.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{totalSources} nguồn tổng hợp</span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <span className="px-2 font-semibold text-slate-800">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <SourceDocumentsDrawer
        source={drawerSource}
        fromDate={data?.fromDate ?? fromDate}
        toDate={data?.toDate ?? toDate}
        method={method}
        onClose={() => setDrawerSource(null)}
      />
    </MainLayout>
  )
}
