import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { EditEmployeeModal } from '../components/EditEmployeeModal'
import { EmployeeRecentShiftsCard } from '../components/EmployeeRecentShiftsCard'
import { HR_EMPLOYEE_STATUS_LABELS } from '../hr-employees.mock'
import { useHrEmployeeDetailQuery } from '../hr-employees.hook'
import { formatHrRoleLabel, isHrAdmin, resolveHrRoleCode } from '../hr-role.util'
import { hrPaths } from '../hr.route'

export default function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
  }
  const effectiveRoleCode = resolveHrRoleCode(currentUser, location.search)
  const isAdmin = isHrAdmin(effectiveRoleCode)

  const { data: employee, isLoading } = useHrEmployeeDetailQuery(id)

  const navigateFromSidebar = (item: string) => {
    const targetPath = workspacePathFor(item)
    if (targetPath) navigate(targetPath)
  }

  const statusTextColor =
    employee?.status === 'locked'
      ? 'text-rose-700'
      : employee?.status === 'pending_activation'
        ? 'text-amber-700'
        : 'text-emerald-700'

  return (
    <MainLayout
      actionButton={
        employee ? (
          isAdmin ? (
            <Button
              className="min-h-[44px] px-4 font-semibold"
              data-testid="hrm01-edit-profile-btn"
              onClick={() => setIsEditModalOpen(true)}
              type="button"
              variant="primary"
            >
              Chỉnh sửa hồ sơ
            </Button>
          ) : (
            <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600">
              Chỉ Admin được chỉnh sửa hồ sơ
            </span>
          )
        ) : undefined
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Danh sách nhân viên', to: `${hrPaths.employees}${location.search}` },
        { label: employee?.fullName ?? id },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle={
        employee
          ? `Hồ sơ tài khoản và ca trực của ${employee.fullName}`
          : 'Tra cứu thông tin nhân viên'
      }
      pageTitle="Chi tiết nhân viên"
      user={currentUser}
    >
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <p className="py-8 text-center text-xs text-slate-500">
              Đang tải hồ sơ nhân viên...
            </p>
          </Card>
        ) : !employee ? (
          <Card>
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">
                Không tìm thấy hồ sơ nhân viên
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Mã nhân viên {id} không tồn tại hoặc đã bị xóa khỏi danh sách.
              </p>
              <div className="mt-4">
                <Link
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  to={`${hrPaths.employees}${location.search}`}
                >
                  Quay lại danh sách nhân viên
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card
              action={
                <span className={`text-xs font-medium ${statusTextColor}`}>
                  Trạng thái: {HR_EMPLOYEE_STATUS_LABELS[employee.status]}
                </span>
              }
              title="Thông tin tài khoản"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 pt-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Mã nhân viên</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.code}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Họ và tên</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.fullName}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Vai trò</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatHrRoleLabel(employee.roleCode)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">
                    Email đăng nhập
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {employee.email}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">
                    Số điện thoại
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.phone}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Cơ sở</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.branchName}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">
                    Ngày tạo tài khoản
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.createdAt}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">
                    Tên đăng nhập
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {employee.username}
                  </div>
                </div>
              </div>
            </Card>

            <EmployeeRecentShiftsCard key={employee.id} shifts={employee.recentShifts} />
          </>
        )}
      </div>

      <EditEmployeeModal
        employee={employee ?? null}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </MainLayout>
  )
}
