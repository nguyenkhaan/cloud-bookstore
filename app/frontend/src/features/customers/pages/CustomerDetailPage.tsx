import { useId, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  ShieldCheck,
  Unlock,
} from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { StatCard } from '@/components/common/StatCard'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { EditCustomerDialog } from '../components/EditCustomerDialog'
import { useCustomer, useUpdateCustomer } from '../customers.hook'
import {
  formatDateVi,
  formatPhoneNumber,
  formatVnd,
  getInitials,
  getTierBadge,
  getTierPolicy,
  maskNationalId,
} from '../customers.presentation'
import { customerPaths } from '../customers.route'

type HistoryTabId = 'rentals' | 'sales' | 'buybacks' | 'violations'

export default function CustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const tabsBaseId = useId()

  const { data: customer, isLoading, isError, error } = useCustomer(id)
  const updateCustomerMutation = useUpdateCustomer()

  const [activeTab, setActiveTab] = useState<HistoryTabId>('rentals')
  const [isNationalIdRevealed, setIsNationalIdRevealed] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const currentUser = session?.user ?? { name: 'Nhân viên', role: 'Quản trị viên' }

  const navigateFromSidebar = (sidebarId: string) => {
    const targetPath = workspacePathFor(sidebarId)
    if (targetPath) navigate(targetPath)
  }

  const backToListButton = (
    <Link
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
      to={customerPaths.customerList}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      <span>Danh sách khách hàng</span>
    </Link>
  )

  if (isLoading) {
    return (
      <MainLayout
        actionButton={backToListButton}
        breadcrumbs={[
          { label: 'Không gian làm việc', to: '/dashboard' },
          { label: 'Khách hàng', to: customerPaths.customerList },
          { label: 'Hồ sơ 360°' },
        ]}
        currentPath="customers"
        onNavigate={navigateFromSidebar}
        onSignOut={signOut}
        pageTitle="Hồ sơ khách hàng 360°"
        user={currentUser}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-600 shadow-2xs">
          Đang tải thông tin hồ sơ khách hàng...
        </div>
      </MainLayout>
    )
  }

  if (isError || !customer) {
    return (
      <MainLayout
        actionButton={backToListButton}
        breadcrumbs={[
          { label: 'Không gian làm việc', to: '/dashboard' },
          { label: 'Khách hàng', to: customerPaths.customerList },
          { label: 'Không tìm thấy' },
        ]}
        currentPath="customers"
        onNavigate={navigateFromSidebar}
        onSignOut={signOut}
        pageTitle="Không thể tải hồ sơ khách hàng"
        user={currentUser}
      >
        <div
          className="rounded-2xl border border-rose-200/80 bg-white p-8 text-center shadow-2xs"
          role="alert"
        >
          <p className="text-sm font-semibold text-rose-700">
            {error instanceof Error ? error.message : 'Không tìm thấy khách hàng hoặc bạn không có quyền truy cập.'}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Vui lòng kiểm tra lại đường dẫn hoặc quay về danh sách khách hàng.
          </p>
          <div className="mt-5 flex justify-center">
            {backToListButton}
          </div>
        </div>
      </MainLayout>
    )
  }

  const tierBadge = getTierBadge(customer.tierName)
  const policy = getTierPolicy(customer.tierName, customer.eligibleSpend)
  const violationCount = customer.isFlagged || customer.flagReason ? 1 : 0

  const tabs: Array<{ id: HistoryTabId; label: string; count: number }> = [
    { id: 'rentals', label: 'Thuê & Trả', count: 0 },
    { id: 'sales', label: 'Mua sách', count: 0 },
    { id: 'buybacks', label: 'Bán sách cũ', count: 0 },
    { id: 'violations', label: 'Vi phạm & Ghi chú', count: violationCount },
  ]

  const handleToggleRentalLock = async () => {
    const nextFlagged = !customer.isFlagged
    try {
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        request: {
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          nationalId: customer.nationalId,
          address: customer.address,
          isFlagged: nextFlagged,
          flagReason: nextFlagged
            ? (customer.flagReason?.trim() || 'Đã chặn quyền thuê sách tại quầy')
            : '',
        },
      })
      notify.success(
        nextFlagged
          ? `Đã chặn quyền thuê sách của ${customer.fullName}`
          : `Đã mở lại quyền thuê sách cho ${customer.fullName}`,
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái thuê sách'
      notify.error(message)
    }
  }

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = -1
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1
    }
    if (nextIndex < 0) return
    event.preventDefault()
    const nextTab = tabs[nextIndex]
    setActiveTab(nextTab.id)
    document.getElementById(`${tabsBaseId}-tab-${nextTab.id}`)?.focus()
  }

  return (
    <MainLayout
      actionButton={backToListButton}
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Khách hàng', to: customerPaths.customerList },
        { label: customer.fullName },
      ]}
      currentPath="customers"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle={customer.fullName}
      user={currentUser}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Column: Customer Profile, Tier Progress & Actions */}
        <section
          aria-label="Thông tin hồ sơ khách hàng"
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-bold text-indigo-700 ring-1 ring-indigo-100">
              {getInitials(customer.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-bold text-slate-900">
                {customer.fullName}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Tham gia từ {formatDateVi(customer.createdAt)}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                >
                  Hạng {policy.label}
                </span>
                {customer.isFlagged ? (
                  <Badge dot size="sm" variant="danger">
                    Đang chặn thuê
                  </Badge>
                ) : (
                  <Badge dot size="sm" variant="success">
                    Bình thường
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-slate-600">SĐT</dt>
              <dd className="text-right font-mono font-semibold text-slate-800">
                {formatPhoneNumber(customer.phone)}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-slate-600">Email</dt>
              <dd className="min-w-0 break-all text-right font-medium text-slate-800">
                {customer.email || <span className="text-slate-600">Chưa cập nhật</span>}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 font-medium text-slate-600">CCCD</dt>
              <dd className="flex items-center gap-1.5 font-mono font-medium text-slate-800">
                <span>
                  {customer.nationalId
                    ? maskNationalId(customer.nationalId, isNationalIdRevealed)
                    : <span className="font-sans text-slate-600">Chưa cập nhật</span>}
                </span>
                {customer.nationalId && (
                  <button
                    aria-label={isNationalIdRevealed ? 'Ẩn số CCCD' : 'Hiện số CCCD'}
                    aria-pressed={isNationalIdRevealed}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    onClick={() => setIsNationalIdRevealed((prev) => !prev)}
                    type="button"
                  >
                    {isNationalIdRevealed ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                )}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 font-medium text-slate-600">Địa chỉ</dt>
              <dd className="min-w-0 break-words text-right font-medium text-slate-800">
                {customer.address || <span className="text-slate-600">Chưa cập nhật</span>}
              </dd>
            </div>
          </dl>

          {customer.isFlagged && (
            <div
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
              role="status"
            >
              <p className="font-semibold">Đang áp dụng chặn thuê sách</p>
              <p className="mt-0.5 text-[11px] text-rose-700">
                {customer.flagReason || 'Chưa ghi nhận lý do chi tiết.'}
              </p>
            </div>
          )}

          {/* Cumulative Spend & Tier Progress */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Chi tiêu hợp lệ tích lũy
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-indigo-600">
              {formatVnd(customer.eligibleSpend)}
            </p>

            <div
              aria-label="Tiến độ nâng hạng thành viên"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={policy.progressPercent}
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${policy.progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {policy.nextTierLabel && policy.nextTierThreshold ? (
                policy.remainingToNextTier > 0 ? (
                  <>
                    Còn <span className="font-semibold text-slate-800">{formatVnd(policy.remainingToNextTier)}</span> lên Hạng{' '}
                    <span className="font-semibold text-slate-800">{policy.nextTierLabel}</span>{' '}
                    ({formatVnd(policy.nextTierThreshold)})
                  </>
                ) : (
                  <>Đã đạt ngưỡng chi tiêu Hạng {policy.nextTierLabel} ({formatVnd(policy.nextTierThreshold)})</>
                )
              ) : (
                <>Đã đạt hạng thành viên cao nhất (từ 3.000.000 đ)</>
              )}
            </p>

            <div className="mt-3.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Quyền lợi Hạng {policy.label}</p>
              <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
                <li>
                  • Thuê tối đa <strong className="text-slate-800">{policy.maxBooks} cuốn</strong> · tối đa{' '}
                  <strong className="text-slate-800">{policy.maxRentalDays} ngày</strong>/phiếu
                </li>
                <li>
                  •{' '}
                  {policy.rentDiscountPct > 0
                    ? `Giảm ${policy.rentDiscountPct}% phí thuê & ${policy.saleDiscountPct}% giá mua sách`
                    : 'Chưa áp dụng giảm giá thuê & mua sách (0%)'}
                </li>
                <li>• Không giảm tiền cọc (100% giá bán thực tế)</li>
              </ul>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="mt-5 space-y-2.5">
            <Button
              className="min-h-[44px]"
              fullWidth
              icon={<Pencil aria-hidden="true" className="size-4" />}
              onClick={() => setIsEditDialogOpen(true)}
              type="button"
              variant="primary"
            >
              Chỉnh sửa thông tin
            </Button>

            <Button
              className={
                customer.isFlagged
                  ? 'min-h-[44px] border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100/70'
                  : 'min-h-[44px] border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800'
              }
              fullWidth
              icon={
                customer.isFlagged
                  ? <Unlock aria-hidden="true" className="size-4" />
                  : <Lock aria-hidden="true" className="size-4" />
              }
              loading={updateCustomerMutation.isPending}
              onClick={handleToggleRentalLock}
              type="button"
              variant="secondary"
            >
              {customer.isFlagged ? 'Mở quyền thuê sách' : 'Chặn quyền thuê sách'}
            </Button>
          </div>
        </section>

        {/* Right Column: Metrics & 360° Transaction History */}
        <div className="min-w-0 space-y-5">
          {/* 3 Metric Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              description={`Hạn mức ${policy.maxBooks} cuốn · ${policy.maxRentalDays} ngày`}
              label="Đang giữ"
              value={`0/${policy.maxBooks} cuốn`}
              valueColor="default"
            />
            <StatCard
              description="Hoàn trả khi quyết toán phiếu thuê"
              label="Tiền cọc đang giữ"
              value={formatVnd(0)}
              valueColor="indigo"
            />
            <StatCard
              description={
                customer.isFlagged
                  ? (customer.flagReason || 'Đang chặn thuê sách mới')
                  : 'Chưa ghi nhận trả trễ / vi phạm'
              }
              label="Vi phạm / Trả trễ"
              value={customer.isFlagged ? '1 ghi nhận' : 0}
              valueColor={customer.isFlagged ? 'rose' : 'default'}
            />
          </div>

          {/* Transaction History Tabs Card */}
          <section
            aria-label="Lịch sử giao dịch"
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">Lịch sử giao dịch</h2>
                <span className="text-[11px] text-slate-600">
                  Không áp dụng điểm tích lũy
                </span>
              </div>

              <div
                aria-label="Loại lịch sử giao dịch"
                aria-orientation="horizontal"
                className="-mb-px flex flex-wrap gap-1 sm:gap-2"
                role="tablist"
              >
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      aria-controls={`${tabsBaseId}-panel-${tab.id}`}
                      aria-selected={isActive}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 motion-reduce:transition-none ${
                        isActive
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                      id={`${tabsBaseId}-tab-${tab.id}`}
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                      role="tab"
                      tabIndex={isActive ? 0 : -1}
                      type="button"
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              aria-labelledby={`${tabsBaseId}-tab-${activeTab}`}
              className="mt-5"
              id={`${tabsBaseId}-panel-${activeTab}`}
              role="tabpanel"
            >
              {activeTab === 'rentals' && (
                <div className="overflow-x-auto">
                  <table className="hidden w-full min-w-[540px] text-left text-xs sm:table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-indigo-50/50 text-[11px] font-semibold text-slate-600">
                        <th className="rounded-l-lg px-3 py-2.5">Mã phiếu</th>
                        <th className="px-3 py-2.5">Sách &amp; CopyBarcode</th>
                        <th className="px-3 py-2.5">Ngày / Hạn trả</th>
                        <th className="px-3 py-2.5">Tiền cọc</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-10 text-center text-xs leading-relaxed text-slate-600 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-transparent">
                    Chưa có phiếu thuê hoặc trả sách nào được ghi nhận cho khách hàng này.
                  </div>
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="overflow-x-auto">
                  <table className="hidden w-full min-w-[540px] text-left text-xs sm:table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-indigo-50/50 text-[11px] font-semibold text-slate-600">
                        <th className="rounded-l-lg px-3 py-2.5">Mã hóa đơn</th>
                        <th className="px-3 py-2.5">Sách đã mua</th>
                        <th className="px-3 py-2.5">Ngày giao dịch</th>
                        <th className="px-3 py-2.5">Giảm giá hạng</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Tổng tiền</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-10 text-center text-xs leading-relaxed text-slate-600 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-transparent">
                    Chưa có hóa đơn mua sách nào được ghi nhận cho khách hàng này.
                  </div>
                </div>
              )}

              {activeTab === 'buybacks' && (
                <div className="overflow-x-auto">
                  <table className="hidden w-full min-w-[540px] text-left text-xs sm:table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-indigo-50/50 text-[11px] font-semibold text-slate-600">
                        <th className="rounded-l-lg px-3 py-2.5">Mã phiếu thu mua</th>
                        <th className="px-3 py-2.5">Đầu sách &amp; Phân loại</th>
                        <th className="px-3 py-2.5">Ngày thu mua</th>
                        <th className="px-3 py-2.5">Giá thỏa thuận</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-10 text-center text-xs leading-relaxed text-slate-600 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-transparent">
                    Chưa có giao dịch bán sách cũ nào được ghi nhận cho khách hàng này.
                  </div>
                </div>
              )}

              {activeTab === 'violations' && (
                violationCount > 0 ? (
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 text-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-600" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {customer.isFlagged ? 'Hạn chế quyền thuê sách mới' : 'Ghi chú theo dõi hồ sơ'}
                          </p>
                          <p className="mt-1 text-slate-600">
                            {customer.flagReason || 'Đang bật cờ cần theo dõi khi giao dịch thuê sách.'}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="min-h-[44px]"
                        onClick={() => setIsEditDialogOpen(true)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Cập nhật ghi chú
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-10 text-center text-xs text-slate-600">
                    <ShieldCheck aria-hidden="true" className="mx-auto mb-2 size-6 text-emerald-600" />
                    <p className="font-semibold text-slate-700">Chưa có vi phạm hoặc ghi chú đặc biệt</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Khách hàng chưa có lịch sử trả trễ hoặc nghĩa vụ bồi thường chưa thanh toán.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Operational Status Banner */}
            {customer.isFlagged ? (
              <div
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/80 p-3.5 text-xs text-rose-800"
                role="status"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-600" />
                <p>
                  Hồ sơ đang ở trạng thái <strong>tạm chặn quyền thuê sách mới</strong>
                  {customer.flagReason ? ` (${customer.flagReason})` : ''}. Vui lòng xử lý nghĩa vụ hoặc bấm &ldquo;Mở quyền thuê sách&rdquo; trước khi lập phiếu thuê mới.
                </p>
              </div>
            ) : (
              <div
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs text-emerald-800"
                role="status"
              >
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p>
                  Hồ sơ đủ điều kiện thuê mới: tối đa <strong>{policy.maxBooks} cuốn</strong> ({policy.maxRentalDays} ngày/phiếu), không có nợ cước quá hạn. Giao dịch đủ điều kiện được cộng vào chi tiêu hợp lệ để xét hạng thành viên.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {isEditDialogOpen && (
        <EditCustomerDialog
          customer={customer}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
        />
      )}
    </MainLayout>
  )
}
