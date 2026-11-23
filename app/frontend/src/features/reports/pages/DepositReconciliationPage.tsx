import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Download, Info, RotateCcw, Search } from 'lucide-react'
import { Badge, Button, Card, SelectBox, StatCard } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { ReportsSubNav } from '../components/ReportsSubNav'
import { exportDepositReconciliationExcel } from '../reports.export'
import { useDepositReconciliationQuery } from '../reports.hook'
import {
  depositStatusBadgeVariant,
  formatSignedVnd,
  formatVnDateShort,
  formatVnd,
  getCurrentVnMonthRange,
  toNumber,
} from '../reports.presentation'
import type { DepositReconciliationFilters } from '../reports.type'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'RENTING', label: 'Đang thuê' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'SETTLED', label: 'Đã quyết toán' },
  { value: 'LOST', label: 'Mất → Bán' },
  { value: 'CAPPED', label: 'Chạm trần cọc' },
]

function formatGroupedDigits(digits: string): string {
  return digits === '' ? '' : Number(digits).toLocaleString('vi-VN')
}

export default function DepositReconciliationPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const defaultPeriod = useMemo(() => getCurrentVnMonthRange(), [])

  const [fromDate, setFromDate] = useState(defaultPeriod.from)
  const [toDate, setToDate] = useState(defaultPeriod.to)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Inputs are local because manual verification does not need a persisted table.
  const [cashActualInput, setCashActualInput] = useState<string | null>(null)
  const [bankActualInput, setBankActualInput] = useState<string | null>(null)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  const filters = useMemo<DepositReconciliationFilters>(
    () => ({
      from: fromDate || undefined,
      to: toDate || undefined,
      status: status || undefined,
      search: debouncedSearch || undefined,
      page,
      pageSize: 10,
    }),
    [fromDate, toDate, status, debouncedSearch, page],
  )

  const reportQuery = useDepositReconciliationQuery(filters)
  const data = reportQuery.data

  const cashObligation = toNumber(data?.cashObligationAmount)
  const bankObligation = toNumber(data?.bankObligationAmount)
  const closingBalance = toNumber(data?.closingDepositBalance)
  const suggestedCash = toNumber(data?.suggestedCashActualBalance)

  const cashActual =
    cashActualInput !== null ? Math.max(0, Number(cashActualInput) || 0) : suggestedCash
  const bankActual =
    bankActualInput !== null ? Math.max(0, Number(bankActualInput) || 0) : bankObligation
  const totalActual = cashActual + bankActual

  const cashDiff = cashActual - cashObligation
  const bankDiff = bankActual - bankObligation
  const totalDiff = totalActual - closingBalance

  const slips = data?.slips?.items ?? []
  const totalSlips = toNumber(data?.slips?.totalCount)
  const totalPages = Math.max(1, toNumber(data?.slips?.totalPages) || 1)

  const handleResetFilters = () => {
    setFromDate(defaultPeriod.from)
    setToDate(defaultPeriod.to)
    setStatus('')
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
    setCashActualInput(null)
    setBankActualInput(null)
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
        { label: 'Báo cáo Đối soát Tiền cọc đang giữ' },
      ]}
      pageTitle="Báo cáo Đối soát Tiền cọc đang giữ"
      pageHeaderContent={<ReportsSubNav active="deposit-reconciliation" />}
      actionButton={
        <Button
          type="button"
          onClick={() => data && exportDepositReconciliationExcel(data, cashActual, bankActual)}
          disabled={!data}
          className="min-h-10"
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Xuất bảng đối soát
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Filter Bar */}
        <Card padding="sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="relative xl:col-span-5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="rep03-search" className="sr-only">
                Tìm mã phiếu thuê, SĐT hoặc khách hàng
              </label>
              <input
                id="rep03-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã phiếu thuê, SĐT hoặc khách hàng..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 xl:col-span-4">
              <div>
                <label htmlFor="rep03-from" className="sr-only">
                  Từ ngày
                </label>
                <input
                  id="rep03-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value)
                    setPage(1)
                    setCashActualInput(null)
                    setBankActualInput(null)
                  }}
                  aria-label="Từ ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="rep03-to" className="sr-only">
                  Đến ngày
                </label>
                <input
                  id="rep03-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value)
                    setPage(1)
                    setCashActualInput(null)
                    setBankActualInput(null)
                  }}
                  aria-label="Đến ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 xl:col-span-3">
              <SelectBox
                label="Trạng thái phiếu thuê"
                hideLabel
                searchable={false}
                className="min-w-0 flex-1"
                value={status}
                onChange={(val) => {
                  setStatus(val)
                  setPage(1)
                }}
                options={STATUS_OPTIONS}
              />
              <button
                type="button"
                onClick={handleResetFilters}
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
              : 'Không thể tải báo cáo đối soát tiền cọc.'}
          </div>
        )}

        {/* 5 KPI Bridge Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Cọc đầu kỳ"
            value={formatVnd(data?.openingDepositBalance)}
            valueColor="default"
            description={`Số dư tại ${formatVnDateShort(data?.fromDate ?? fromDate)}`}
          />
          <StatCard
            label="Cọc nhận trong kỳ"
            value={formatSignedVnd(data?.collectedInPeriod, '+')}
            valueColor="emerald"
            description="Thu tiền bảo đảm"
          />
          <StatCard
            label="Cọc đã hoàn"
            value={formatSignedVnd(-toNumber(data?.refundedInPeriod))}
            valueColor="default"
            description="Hoàn tiền mặt / Ngân hàng"
          />
          <StatCard
            label="Cấn trừ / Mất sách"
            value={formatSignedVnd(-toNumber(data?.deductedAndLostTotalInPeriod))}
            valueColor="amber"
            description={`${formatVnd(data?.deductedFeeInPeriod)} phí + ${formatVnd(data?.lostRetainedInPeriod)} mất`}
          />
          <StatCard
            label="Cọc cuối kỳ"
            value={formatVnd(closingBalance)}
            valueColor="indigo"
            description="Khoản nợ phải trả khách hàng"
          />
        </div>

        {/* Formula Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
          <span>
            {formatVnd(data?.openingDepositBalance)} + {formatVnd(data?.collectedInPeriod)} −{' '}
            {formatVnd(data?.refundedInPeriod)} − {formatVnd(data?.deductedAndLostTotalInPeriod)} ={' '}
            <strong>{formatVnd(closingBalance)}</strong>. Phí chỉ ghi nhận khi quyết toán; cọc mất sách chuyển doanh thu bán một lần.
          </span>
        </div>

        {/* Source Reconciliation + Refund Rule */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card title="Đối chiếu nguồn giữ tiền" className="h-full lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                    <th className="px-4 py-2.5 font-semibold first:rounded-l-xl">Nguồn</th>
                    <th className="px-4 py-2.5 font-semibold">Số nghĩa vụ</th>
                    <th className="px-4 py-2.5 font-semibold">Thực tế xác minh</th>
                    <th className="px-4 py-2.5 font-semibold last:rounded-r-xl">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">Tiền mặt giữ hộ</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{formatVnd(cashObligation)}</td>
                    <td className="px-4 py-3.5">
                      <label htmlFor="cash-actual-input" className="sr-only">
                        Tiền mặt thực tế xác minh
                      </label>
                      <div className="flex h-9 w-36 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 focus-within:border-indigo-500 focus-within:bg-white">
                        <input
                          id="cash-actual-input"
                          type="text"
                          inputMode="numeric"
                          value={formatGroupedDigits(cashActualInput ?? String(suggestedCash))}
                          onChange={(e) => setCashActualInput(e.target.value.replace(/\D/g, ''))}
                          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-900 focus:outline-none"
                        />
                        <span aria-hidden="true" className="text-xs text-slate-500">đ</span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3.5 font-semibold ${
                        cashDiff === 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatSignedVnd(cashDiff, '+')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">Tài khoản ngân hàng</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{formatVnd(bankObligation)}</td>
                    <td className="px-4 py-3.5">
                      <label htmlFor="bank-actual-input" className="sr-only">
                        Số dư ngân hàng thực tế xác minh
                      </label>
                      <div className="flex h-9 w-36 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 focus-within:border-indigo-500 focus-within:bg-white">
                        <input
                          id="bank-actual-input"
                          type="text"
                          inputMode="numeric"
                          value={formatGroupedDigits(bankActualInput ?? String(bankObligation))}
                          onChange={(e) => setBankActualInput(e.target.value.replace(/\D/g, ''))}
                          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-900 focus:outline-none"
                        />
                        <span aria-hidden="true" className="text-xs text-slate-500">đ</span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3.5 font-semibold ${
                        bankDiff === 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatSignedVnd(bankDiff, '+')}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/70 font-bold">
                    <td className="px-4 py-3.5 text-slate-900">Tổng cuối kỳ</td>
                    <td className="px-4 py-3.5 text-slate-900">{formatVnd(closingBalance)}</td>
                    <td className="px-4 py-3.5 text-slate-900">{formatVnd(totalActual)}</td>
                    <td
                      className={`px-4 py-3.5 ${
                        totalDiff === 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatSignedVnd(totalDiff, '+')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {totalDiff !== 0 || cashDiff !== 0 || bankDiff !== 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>
                  Lệch {formatSignedVnd(totalDiff, '+')} so với nghĩa vụ cuối kỳ
                  {cashDiff !== 0 ? ` (Tiền mặt: ${formatSignedVnd(cashDiff, '+')})` : ''}
                  {bankDiff !== 0 ? ` (Ngân hàng: ${formatSignedVnd(bankDiff, '+')})` : ''}. Kiểm tra phiếu hoàn cọc hoặc két tiền mặt trước khi chốt đối soát.
                </span>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Số dư thực tế xác minh khớp với nghĩa vụ tiền cọc đang giữ hộ.</span>
              </div>
            )}

            {data?.alertBannerMessage && (
              <p className="mt-2 text-[11px] text-amber-700">{data.alertBannerMessage}</p>
            )}
          </Card>

          <Card title="Nguyên tắc hoàn cọc" className="h-full">
            <div className="text-xl font-bold tracking-tight text-indigo-600">
              max(0, Cọc − Khoản trừ)
            </div>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
              <p>
                Khoản trừ: thuê, gia hạn, phạt, cọc cuốn mất. Khi cọc hết, hoàn 0đ và không thu thêm.
              </p>
              <p>
                Cuốn mất: giữ 100% cọc thành doanh thu bán, không cộng phí thuê / trễ của cuốn đó.
              </p>
            </div>
            <div className="mt-4">
              <Badge variant="orange" size="md">
                Không tính cọc nhận là doanh thu
              </Badge>
            </div>
          </Card>
        </div>

        {/* Slip Obligations Table */}
        <Card
          title="Chi tiết phiếu thuê & Nghĩa vụ tiền cọc"
          subtitle="Phí chưa quyết toán chỉ là nghĩa vụ dự kiến; chưa giảm số dư cọc đang giữ."
        >
          {reportQuery.isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : slips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
              Không tìm thấy phiếu thuê nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[740px] w-full text-left text-xs">
                <thead>
                  <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                    <th className="px-4 py-3 font-semibold first:rounded-l-xl">Phiếu / Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Cọc đã thu</th>
                    <th className="px-4 py-3 font-semibold">Khoản trừ đã chốt</th>
                    <th className="px-4 py-3 font-semibold">Cọc đã hoàn</th>
                    <th className="px-4 py-3 font-semibold">Đang giữ</th>
                    <th className="px-4 py-3 font-semibold last:rounded-r-xl">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slips.map((slip) => (
                    <tr key={slip.slipId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{slip.slipNo}</div>
                        <div className="mt-0.5 text-slate-600">
                          <Link
                            to={`/customers/${encodeURIComponent(slip.customerId)}`}
                            className="hover:text-indigo-600"
                          >
                            {slip.customerName}
                          </Link>
                          {slip.customerPhone ? ` · ${slip.customerPhone}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {formatVnd(slip.depositCollected)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {formatVnd(slip.settledDeduction)}
                        {slip.statusCode === 'LOST' ? ' (mất)' : slip.statusCode === 'CAPPED' ? ' (chạm trần)' : ''}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{formatVnd(slip.refundedAmount)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {formatVnd(slip.currentlyHeld)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={depositStatusBadgeVariant(slip.statusCode)} size="xs">
                          {slip.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Tổng {totalSlips} phiếu trong kỳ · {data?.totalActiveObligationSlips ?? 0} phiếu đang giữ cọc cuối kỳ
            </span>
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
    </MainLayout>
  )
}
