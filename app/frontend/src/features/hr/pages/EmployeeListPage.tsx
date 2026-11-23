import { useState, useTransition } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SearchIcon } from '@/components/common/Icons'
import { SelectBox } from '@/components/common/SelectBox'
import { StatCard } from '@/components/common/StatCard'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { AddEmployeeModal } from '../components/AddEmployeeModal'
import { HR_EMPLOYEE_STATUS_LABELS } from '../hr-employees.mock'
import { useHrEmployeesQuery } from '../hr-employees.hook'
import type { BackendRoleName, HrEmployeeStatus } from '../hr-employees.type'
import { formatHrRoleLabel, isHrAdmin, resolveHrRoleCode } from '../hr-role.util'
import { hrPaths } from '../hr.route'

const PAGE_SIZE = 6

export default function EmployeeListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<BackendRoleName | ''>('')
  const [statusFilter, setStatusFilter] = useState<HrEmployeeStatus | ''>('')
  const [page, setPage] = useState(1)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
  }
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)

  const { data, isLoading } = useHrEmployeesQuery({
    search,
    roleCode: roleFilter,
    status: statusFilter,
    page,
    pageSize: PAGE_SIZE,
  })

  const employees = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = data?.totalPages ?? 1
  const currentPage = data?.page ?? page
  const kpi = data?.kpi ?? {
    activeCount: 12,
    newAccountsCount: 2,
    inShiftCount: 5,
    rootAdminCount: 1,
  }

  const handleResetFilters = () => {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
    setPage(1)
  }

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const startRow = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endRow = Math.min(currentPage * PAGE_SIZE, totalCount)

  return (
    <MainLayout
      actionButton={
        isAdmin ? (
          <Button
            className="min-h-[44px] px-4 font-semibold"
            data-testid="hrm01-add-account-btn"
            onClick={() => setIsAddModalOpen(true)}
            type="button"
            variant="primary"
          >
            + Thêm tài khoản
          </Button>
        ) : undefined
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Danh sách nhân viên' },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle="Danh sách nhân viên"
      user={currentUser}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            description="Tài khoản nội bộ đang quản lý"
            label="Nhân sự đang hoạt động"
            value={kpi.activeCount}
          />
          <StatCard
            description="Chờ thiết lập mật khẩu"
            label="Tài khoản mới"
            value={kpi.newAccountsCount}
          />
          <StatCard
            description="Ca sáng · 08:00–13:00"
            label="Đang trong ca"
            value={kpi.inShiftCount}
          />
          <StatCard
            description="RootAdmin · Được bảo vệ"
            label="Tài khoản gốc"
            value={kpi.rootAdminCount}
          />
        </div>

        <Card padding="lg" title="Nhân viên cửa hàng">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <SearchIcon size={16} />
              </div>
              <input
                aria-label="Tìm tên, mã nhân viên hoặc email"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-indigo-50/40 py-2.5 pr-4 pl-10 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                data-testid="hrm01-search-input"
                onChange={(event) => {
                  const nextValue = event.target.value
                  setSearch(nextValue)
                  startTransition(() => {
                    setPage(1)
                  })
                }}
                placeholder="Tìm tên, mã nhân viên hoặc email…"
                type="text"
                value={search}
              />
            </div>

            <div className="w-full shrink-0 sm:w-44">
              <SelectBox
                hideLabel
                label="Lọc theo vai trò"
                onChange={(value) => {
                  setRoleFilter(value as BackendRoleName | '')
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Vai trò: Tất cả' },
                  { value: 'ADMIN', label: 'Quản trị viên' },
                  { value: 'CASHIER', label: 'Thu ngân' },
                  { value: 'INVENTORY_MANAGER', label: 'Quản lý kho' },
                ]}
                searchable={false}
                value={roleFilter}
              />
            </div>

            <div className="w-full shrink-0 sm:w-48">
              <SelectBox
                hideLabel
                label="Lọc theo trạng thái"
                onChange={(value) => {
                  setStatusFilter(value as HrEmployeeStatus | '')
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Trạng thái: Tất cả' },
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'in_shift', label: 'Đang trong ca' },
                  { value: 'pending_activation', label: 'Chờ kích hoạt' },
                  { value: 'locked', label: 'Đã khóa' },
                ]}
                searchable={false}
                value={statusFilter}
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                  <th className="rounded-l-lg px-3 py-3">Nhân viên / Mã</th>
                  <th className="px-3 py-3">Email / Số điện thoại</th>
                  <th className="px-3 py-3">Vai trò</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="rounded-r-lg px-3 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="py-12 text-center text-slate-500" colSpan={5}>
                      Đang tải danh sách nhân viên...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td className="py-10" colSpan={5}>
                      <div className="mx-auto max-w-md rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
                        <p className="text-sm font-semibold text-slate-800">
                          Không tìm thấy nhân viên phù hợp
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Thử từ khóa khác hoặc xóa bộ lọc hiện tại.
                        </p>
                        <div className="mt-4">
                          <Button
                            className="min-h-[44px]"
                            onClick={handleResetFilters}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Xóa bộ lọc
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-3 py-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {employee.fullName}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-600">
                          {employee.code}
                          {employee.isRootAdmin ? ' · RootAdmin' : ''}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-top text-slate-600">
                        <div>{employee.email}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {employee.phone}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-top text-slate-600">
                        {formatHrRoleLabel(employee.roleCode)}
                      </td>

                      <td className="px-3 py-3.5 align-top text-slate-600">
                        {HR_EMPLOYEE_STATUS_LABELS[employee.status]}
                      </td>

                      <td className="px-3 py-3.5 align-top">
                        <Link
                          className="inline-flex min-h-[44px] items-center rounded-md px-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          to={`${hrPaths.employeeDetail(employee.id)}${location.search}`}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>
                Hiển thị {startRow}–{endRow} trong {totalCount} nhân sự
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Trang trước"
                  className="inline-flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  type="button"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      aria-current={currentPage === pageNumber ? 'page' : undefined}
                      className={`inline-flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                        currentPage === pageNumber
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      onClick={() => setPage(pageNumber)}
                      type="button"
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
                <button
                  aria-label="Trang sau"
                  className="inline-flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  type="button"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </MainLayout>
  )
}
