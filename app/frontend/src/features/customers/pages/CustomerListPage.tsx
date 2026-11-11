import { useState, useTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { Button } from '@/components/common/Button'
import { StatCard } from '@/components/common/StatCard'
import { SelectBox } from '@/components/common/SelectBox'
import { SearchIcon } from '@/components/common/Icons'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { notify } from '@/components/common/Toast'
import { AddCustomerDialog } from '../components/AddCustomerDialog'
import { ExportCustomerDialog } from '../components/ExportCustomerDialog'
import { exportCustomersToFile } from '../customers.export'
import type { CustomerExportFormat } from '../customers.export'
import { useCustomers, useCustomerStats } from '../customers.hook'
import { listCustomers } from '../customers.service'
import {
  formatPhoneNumber,
  formatVnd,
  getInitials,
  getTierBadge,
} from '../customers.presentation'
import { customerPaths } from '../customers.route'
import type { Customer } from '../customers.type'

export default function CustomerListPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('')
  const [flaggedFilter, setFlaggedFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const trimmedSearch = search.trim() || undefined
  const normalizedTierFilter = tierFilter.trim() || undefined
  const flaggedQueryParam = flaggedFilter === '' ? undefined : flaggedFilter === 'flagged'

  // Query customers
  const { data: customerData, isLoading } = useCustomers({
    page,
    pageSize: 10,
    search: trimmedSearch,
    ...(normalizedTierFilter ? { tierName: normalizedTierFilter } : {}),
    isFlagged: flaggedQueryParam,
  })

  // Query stats
  const { data: statsData } = useCustomerStats()

  const customers = customerData?.items ?? []
  const totalCount = customerData?.totalCount ?? 0
  const totalPages = customerData?.totalPages ?? 1

  const displayedCustomers = customers
  const exportableRecordCount = totalCount

  const handleOpenExport = () => {
    setExportError(null)
    setIsExportDialogOpen(true)
  }

  const handleSelectExportFormat = async (format: CustomerExportFormat) => {
    setExportError(null)
    setIsExporting(true)

    try {
      let allMatching: Customer[] = []

      if (totalPages <= 1 && page === 1 && customerData) {
        allMatching = customerData.items
      } else {
        const firstPage = await listCustomers({
          page: 1,
          pageSize: 100,
          search: trimmedSearch,
          tierName: normalizedTierFilter,
          isFlagged: flaggedQueryParam,
        })
        allMatching = [...firstPage.items]

        for (let nextPage = 2; nextPage <= firstPage.totalPages; nextPage += 1) {
          const pageResult = await listCustomers({
            page: nextPage,
            pageSize: 100,
            search: trimmedSearch,
            tierName: normalizedTierFilter,
            isFlagged: flaggedQueryParam,
          })
          allMatching.push(...pageResult.items)
        }
      }

      if (allMatching.length === 0) {
        setExportError('Không có khách hàng nào khớp với bộ lọc hiện tại để xuất.')
        return
      }

      exportCustomersToFile(allMatching, format)
      notify.success(
        format === 'excel'
          ? `Đã xuất ${allMatching.length} khách hàng ra tệp Excel (.xlsx)`
          : `Đã xuất ${allMatching.length} khách hàng ra tệp CSV (.csv)`,
      )
      setIsExportDialogOpen(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể xuất danh sách khách hàng'
      setExportError(message)
      notify.error(message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFilters = () => {
    setSearch('')
    setTierFilter('')
    setFlaggedFilter('')
    setPage(1)
  }

  const currentUser = session?.user ?? { name: 'Nhân viên', role: 'Quản trị viên' }

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  return (
    <MainLayout
      currentPath="customers"
      pageTitle="Danh sách Khách hàng & Hạng thành viên"
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Khách hàng', to: '/customers' },
        { label: 'Danh sách Khách hàng & Hạng thành viên' },
      ]}
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      user={currentUser}
      actionButton={
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="min-h-[44px] px-4 font-semibold"
            onClick={handleOpenExport}
            type="button"
            variant="secondary"
          >
            Xuất danh sách
          </Button>
          <Button
            className="min-h-[44px] px-4 font-semibold"
            onClick={() => setIsAddDialogOpen(true)}
            type="button"
            variant="primary"
          >
            + Thêm mới khách hàng
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 4 Stat Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Khách hàng"
            value={statsData?.totalCount ?? totalCount}
            valueColor="default"
          />
          <StatCard
            label="Hạng Bạc"
            value={statsData?.silverCount ?? 0}
            valueColor="default"
            description="Giảm 5% thuê · 5% mua"
          />
          <StatCard
            label="Hạng Vàng"
            value={statsData?.goldCount ?? 0}
            valueColor="amber"
            description="Giảm 10% thuê · 10% mua"
          />
          <StatCard
            label="Cần theo dõi"
            value={statsData?.flaggedCount ?? 0}
            valueColor="rose"
            description="Có nợ cước / vi phạm"
          />
        </div>

        {/* Main Table Card: Danh bạ khách hàng */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-slate-900">Danh bạ khách hàng</h2>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
                <SearchIcon size={16} />
              </div>
              <input
                aria-label="Tìm kiếm khách hàng theo số điện thoại, mã hoặc họ tên"
                type="text"
                placeholder="Tìm SĐT, mã khách hàng hoặc họ tên…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  startTransition(() => {
                    setPage(1)
                  })
                }}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              />
            </div>

            {/* Tier Filter */}
            <div className="w-full shrink-0 sm:w-44">
              <SelectBox
                hideLabel
                label="Hạng thành viên"
                onChange={(value) => {
                  setTierFilter(value)
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Hạng: Tất cả' },
                  { value: 'REGULAR', label: 'Hạng: Thường' },
                  { value: 'SILVER', label: 'Hạng: Bạc' },
                  { value: 'GOLD', label: 'Hạng: Vàng' },
                ]}
                searchable={false}
                value={tierFilter}
              />
            </div>

            {/* Status Filter */}
            <div className="w-full shrink-0 sm:w-52">
              <SelectBox
                hideLabel
                label="Trạng thái"
                onChange={(value) => {
                  setFlaggedFilter(value)
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Trạng thái: Tất cả' },
                  { value: 'normal', label: 'Trạng thái: Bình thường' },
                  { value: 'flagged', label: 'Trạng thái: Cần theo dõi' },
                ]}
                searchable={false}
                value={flaggedFilter}
              />
            </div>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-indigo-50/50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-3 rounded-l-lg">Mã / Khách hàng</th>
                  <th className="py-3 px-3">Số điện thoại</th>
                  <th className="py-3 px-3">Hạng</th>
                  <th className="py-3 px-3">Chi tiêu hợp lệ</th>
                  <th className="py-3 px-3">Đang giữ</th>
                  <th className="py-3 px-3">Cảnh báo</th>
                  <th className="py-3 px-3 rounded-r-lg text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-600">
                      Đang tải danh sách khách hàng...
                    </td>
                  </tr>
                ) : displayedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-2xl bg-slate-50 p-6 max-w-md w-full border border-slate-100">
                          <p className="font-semibold text-slate-800 text-sm">Chưa tìm thấy khách hàng</p>
                          <p className="mt-1 text-xs text-slate-600">
                            Thử số điện thoại khác hoặc xóa bộ lọc hạng thành viên.
                          </p>
                          <div className="mt-4">
                            <Button variant="outline" size="sm" onClick={handleResetFilters}>
                              Xóa bộ lọc
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedCustomers.map((customer, idx) => {
                    const badge = getTierBadge(customer.tierName)
                    const code = `KH-${String((page - 1) * 10 + idx + 1).padStart(4, '0')}`

                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                              {getInitials(customer.fullName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                <span className="text-slate-600 font-normal mr-1">{code} ·</span>
                                {customer.fullName}
                              </div>
                              {customer.nationalId && (
                                <div className="text-[10px] text-slate-600 mt-0.5">
                                  CCCD: {customer.nationalId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-700">
                          {formatPhoneNumber(customer.phone)}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-700">
                          {formatVnd(customer.eligibleSpend)}
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          0/{customer.tierName === 'GOLD' ? 8 : customer.tierName === 'SILVER' ? 5 : 3}
                        </td>

                        <td className="py-3 px-3">
                          {customer.isFlagged ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                              <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
                              <span>{customer.flagReason || 'Cần theo dõi'}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-600">Bình thường</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Link
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-end whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            to={customerPaths.customerDetail(customer.id)}
                          >
                            Hồ sơ 360°
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
              <p>
                Hiển thị {(page - 1) * 10 + 1}–{Math.min(page * 10, totalCount)} trong {totalCount} khách hàng
              </p>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Trang trước"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      page === p
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  aria-label="Trang sau"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal Dialog */}
      <AddCustomerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => {
          setPage(1)
        }}
      />

      {/* Export Customer Dialog */}
      <ExportCustomerDialog
        errorMessage={exportError}
        isExporting={isExporting}
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onSelectFormat={handleSelectExportFormat}
        recordCount={exportableRecordCount}
      />
    </MainLayout>
  )
}
