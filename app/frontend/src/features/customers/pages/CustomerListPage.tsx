import { useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { Button } from '@/components/common/Button'
import { StatCard } from '@/components/common/StatCard'
import { SearchIcon } from '@/components/common/Icons'
import { useAuth } from '@/features/auth/auth.hook'
import { notify } from '@/components/common/Toast'
import { AddCustomerDialog } from '../components/AddCustomerDialog'
import { useCustomers, useCustomerStats } from '../customers.hook'
import {
  formatPhoneNumber,
  formatVnd,
  getInitials,
  getTierBadge,
} from '../customers.presentation'

export default function CustomerListPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('')
  const [flaggedFilter, setFlaggedFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Query customers
  const { data: customerData, isLoading } = useCustomers({
    page,
    pageSize: 10,
    search: search.trim() || undefined,
    isFlagged: flaggedFilter === '' ? undefined : flaggedFilter === 'flagged',
  })

  // Query stats
  const { data: statsData } = useCustomerStats()

  const customers = customerData?.items ?? []
  const totalCount = customerData?.totalCount ?? 0
  const totalPages = customerData?.totalPages ?? 1

  const handleExport = () => {
    notify.success('Đã xuất danh sách khách hàng (CSV/Excel)')
  }

  const handleResetFilters = () => {
    setSearch('')
    setTierFilter('')
    setFlaggedFilter('')
    setPage(1)
  }

  const currentUser = session?.user ?? { name: 'Nhân viên', role: 'Quản trị viên' }

  const navigateFromSidebar = (id: string) => {
    if (id === 'overview') navigate('/dashboard')
    if (id === 'inventory') navigate('/catalog/series')
    if (id === 'customers') navigate('/customers')
  }

  // Filter in memory for tier if specified (or tierId)
  const displayedCustomers = tierFilter
    ? customers.filter((c) => c.tierName.toUpperCase() === tierFilter.toUpperCase())
    : customers

  return (
    <MainLayout
      currentPath="customers"
      screenCode="SCR-CRM-01 / KHÁCH HÀNG"
      pageTitle="Danh sách Khách hàng & Hạng thành viên"
      breadcrumbs={['Không gian làm việc', 'Khách hàng', 'Danh sách Khách hàng & Hạng thành viên']}
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      user={currentUser}
      actionButton={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} className="min-h-[42px] px-4 font-semibold text-slate-800">
            Xuất danh sách
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="min-h-[42px] px-4 font-semibold text-white shadow-xs"
          >
            + Thêm mới khách hàng
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Subtitle */}
        <p className="-mt-3 text-xs text-slate-500">
          Hiểu khách hàng hơn qua từng lượt đọc · Số điện thoại là khóa định danh chính
        </p>

        {/* 4 Stat Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Khách hàng"
            value={statsData?.totalCount ?? totalCount}
            valueColor="default"
            description="+24 khách trong tháng"
          />
          <StatCard
            label="Hạng Bạc"
            value={statsData?.silverCount ?? 0}
            valueColor="default"
            description="Giảm 10% thuê · 5% mua"
          />
          <StatCard
            label="Hạng Vàng"
            value={statsData?.goldCount ?? 0}
            valueColor="amber"
            description="Giảm 20% thuê · 10% mua"
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
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <SearchIcon size={16} />
              </div>
              <input
                type="text"
                placeholder="Tìm SĐT, mã khách hàng hoặc họ tên…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  startTransition(() => {
                    setPage(1)
                  })
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              />
            </div>

            {/* Tier Filter */}
            <div className="shrink-0">
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              >
                <option value="">Hạng: Tất cả</option>
                <option value="REGULAR">Hạng: Thường</option>
                <option value="SILVER">Hạng: Bạc</option>
                <option value="GOLD">Hạng: Vàng</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="shrink-0">
              <select
                value={flaggedFilter}
                onChange={(e) => {
                  setFlaggedFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              >
                <option value="">Trạng thái: Tất cả</option>
                <option value="normal">Bình thường</option>
                <option value="flagged">Cần theo dõi</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
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
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Đang tải danh sách khách hàng...
                    </td>
                  </tr>
                ) : displayedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-2xl bg-slate-50 p-6 max-w-md w-full border border-slate-100">
                          <p className="font-semibold text-slate-800 text-sm">Chưa tìm thấy khách hàng</p>
                          <p className="mt-1 text-xs text-slate-500">
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
                                <span className="text-slate-400 font-normal mr-1">{code} ·</span>
                                {customer.fullName}
                              </div>
                              {customer.nationalId && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  CCCD: {customer.nationalId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-600">
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

                        <td className="py-3 px-3 text-slate-500">
                          0/{customer.tierName === 'GOLD' ? 8 : customer.tierName === 'SILVER' ? 5 : 3}
                        </td>

                        <td className="py-3 px-3">
                          {customer.isFlagged ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                              <span>⚠️</span> {customer.flagReason || 'Cần theo dõi'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Bình thường</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              notify.success(`Xem hồ sơ 360° khách hàng: ${customer.fullName}`)
                            }}
                            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                          >
                            Hồ sơ 360°
                          </button>
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
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
              <p>
                Hiển thị {(page - 1) * 10 + 1}–{Math.min(page * 10, totalCount)} trong {totalCount} khách hàng
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      page === p
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Information Notice Banner */}
          <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-700">
            <p>
              ⓘ Chi tiêu hợp lệ = tiền mua sách + phí thuê đã quyết toán + phí gia hạn đã quyết toán. Không tính tiền cọc, tiền phạt và các phiếu chưa hoàn tất.
            </p>
          </div>
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
    </MainLayout>
  )
}
