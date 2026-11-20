import { useState, useTransition } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SearchIcon } from '@/components/common/Icons'
import { SelectBox } from '@/components/common/SelectBox'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { cn } from '@/lib/cn'
import { ApprovalHistoryCard } from '../components/ApprovalHistoryCard'
import { ApprovalRequestDetailCard } from '../components/ApprovalRequestDetailCard'
import { CreateHrRequestCard } from '../components/CreateHrRequestCard'
import {
  HR_REQUEST_MONTH_OPTIONS,
  HR_REQUEST_STATUS_LABELS,
  HR_REQUEST_STATUS_OPTIONS,
  HR_REQUEST_TYPE_SHORT_LABELS,
} from '../hr-requests.mock'
import { useHrRequestsSummaryQuery } from '../hr-requests.hook'
import type { HrRequestStatus } from '../hr-requests.type'
import {
  formatHrRoleLabel,
  isHrAdmin,
  resolveHrRoleCode,
} from '../hr-role.util'

type RequestTabKey = 'mine' | 'pending'

const MY_REQUESTS_PAGE_SIZE = 10

export default function HrRequestsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()
  const [, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<RequestTabKey>('mine')
  const [mineSearch, setMineSearch] = useState('')
  const [mineMonth, setMineMonth] = useState('2026-10')
  const [mineStatus, setMineStatus] = useState<HrRequestStatus | ''>('')
  const [minePage, setMinePage] = useState(1)

  const [approvalSearch, setApprovalSearch] = useState('')
  const [approvalMonth, setApprovalMonth] = useState('2026-10')
  const [approvalStatus, setApprovalStatus] = useState<HrRequestStatus | ''>('')
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')

  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
  }
  const effectiveRoleCode = resolveHrRoleCode(currentUser, location.search)
  const isAdmin = isHrAdmin(effectiveRoleCode)
  const effectiveRoleLabel = formatHrRoleLabel(effectiveRoleCode)
  const subtitleUserName =
    effectiveRoleCode === 'CASHIER' && currentUser.name === 'Nguyễn Minh Anh'
      ? 'Trần Hoàng Phong'
      : currentUser.name
  const subtitleCode = effectiveRoleCode === 'ADMIN' ? 'NV-0001' : 'NV-0002'

  const { data, isLoading } = useHrRequestsSummaryQuery(
    {
      search: mineSearch,
      monthKey: mineMonth,
      status: mineStatus,
    },
    {
      search: approvalSearch,
      monthKey: approvalMonth,
      status: approvalStatus,
    },
  )

  const myRequests = data?.myRequests ?? []
  const approvalQueue = data?.approvalQueue ?? []
  const myCount = data?.myCount ?? 0
  const pendingApprovalCount = data?.pendingApprovalCount ?? 0

  const mineTotalPages = Math.max(
    1,
    Math.ceil(myRequests.length / MY_REQUESTS_PAGE_SIZE),
  )
  const safeMinePage = Math.min(minePage, mineTotalPages)
  const visibleMyRequests = myRequests.slice(
    (safeMinePage - 1) * MY_REQUESTS_PAGE_SIZE,
    safeMinePage * MY_REQUESTS_PAGE_SIZE,
  )

  const selectedRequest =
    approvalQueue.find((item) => item.id === selectedRequestId) ??
    approvalQueue[0] ??
    null

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  return (
    <MainLayout
      actionButton={
        <Button
          className="min-h-[44px] px-4 font-semibold"
          onClick={() => {
            setActiveTab('mine')
            setMinePage(1)
          }}
          type="button"
          variant="primary"
        >
          + Tạo đơn mới
        </Button>
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Đơn xét duyệt' },
        {
          label: activeTab === 'mine' ? 'Đơn của tôi' : 'Đơn cần duyệt',
        },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle={
        activeTab === 'mine'
          ? `Đơn của tôi · ${subtitleUserName} · ${subtitleCode} · ${effectiveRoleLabel}`
          : isAdmin
            ? 'Đơn cần duyệt · Góc nhìn Admin'
            : 'Đơn cần duyệt · Chế độ chỉ xem'
      }
      pageTitle="Đơn xét duyệt"
      user={currentUser}
    >
      <div className="space-y-5">
        <div
          aria-label="Phân loại đơn xét duyệt"
          className="flex flex-wrap gap-2 rounded-2xl bg-indigo-50/70 p-1.5"
          role="tablist"
        >
          <button
            aria-selected={activeTab === 'mine'}
            className={cn(
              'min-h-[44px] min-w-[180px] cursor-pointer rounded-xl px-5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
              activeTab === 'mine'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
            data-testid="hrm04-tab-mine"
            onClick={() => setActiveTab('mine')}
            role="tab"
            type="button"
          >
            Đơn của tôi ({myCount})
          </button>

          <button
            aria-selected={activeTab === 'pending'}
            className={cn(
              'min-h-[44px] min-w-[180px] cursor-pointer rounded-xl px-5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
            data-testid="hrm04-tab-pending"
            onClick={() => setActiveTab('pending')}
            role="tab"
            type="button"
          >
            Đơn cần duyệt ({pendingApprovalCount})
          </button>
        </div>

        {activeTab === 'mine' ? (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <Card padding="lg" title="Các yêu cầu đã gửi">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <SearchIcon size={16} />
                  </div>
                  <input
                    aria-label="Tìm mã đơn hoặc lý do"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-indigo-50/40 py-2.5 pr-4 pl-10 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                    onChange={(event) => {
                      setMineSearch(event.target.value)
                      startTransition(() => setMinePage(1))
                    }}
                    placeholder="Tìm mã đơn hoặc lý do…"
                    type="text"
                    value={mineSearch}
                  />
                </div>

                <div className="w-full shrink-0 sm:w-40">
                  <SelectBox
                    hideLabel
                    label="Lọc theo tháng"
                    onChange={(value) => {
                      setMineMonth(value)
                      setMinePage(1)
                    }}
                    options={HR_REQUEST_MONTH_OPTIONS}
                    searchable={false}
                    value={mineMonth}
                  />
                </div>

                <div className="w-full shrink-0 sm:w-44">
                  <SelectBox
                    hideLabel
                    label="Lọc theo trạng thái"
                    onChange={(value) => {
                      setMineStatus(value as HrRequestStatus | '')
                      setMinePage(1)
                    }}
                    options={HR_REQUEST_STATUS_OPTIONS}
                    searchable={false}
                    value={mineStatus}
                  />
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead>
                    <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                      <th className="rounded-l-lg px-3 py-3">Mã đơn / Loại</th>
                      <th className="px-3 py-3">Ngày / Ca</th>
                      <th className="px-3 py-3">Người thay thế</th>
                      <th className="rounded-r-lg px-3 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td
                          className="py-10 text-center text-slate-500"
                          colSpan={4}
                        >
                          Đang tải danh sách yêu cầu...
                        </td>
                      </tr>
                    ) : visibleMyRequests.length === 0 ? (
                      <tr>
                        <td
                          className="py-10 text-center text-slate-500"
                          colSpan={4}
                        >
                          Không có yêu cầu nào phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      visibleMyRequests.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-3.5 align-top">
                            <div className="font-semibold text-slate-900">
                              {item.code}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-slate-700">
                              {HR_REQUEST_TYPE_SHORT_LABELS[item.type]}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 align-top text-slate-600">
                            {item.dateShiftSummary}
                          </td>
                          <td className="px-3 py-3.5 align-top text-slate-600">
                            {item.replacementName}
                          </td>
                          <td className="px-3 py-3.5 align-top text-slate-600">
                            {HR_REQUEST_STATUS_LABELS[item.status]}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span>
                  {visibleMyRequests.length} trong {myRequests.length} đơn cá nhân · Không được sửa đơn đã duyệt
                </span>
                {myRequests.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Trang trước"
                      className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={safeMinePage <= 1}
                      onClick={() =>
                        setMinePage((prev) => Math.max(1, prev - 1))
                      }
                      type="button"
                    >
                      ‹
                    </button>
                    {Array.from(
                      { length: mineTotalPages },
                      (_, index) => index + 1,
                    ).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        aria-current={
                          safeMinePage === pageNumber ? 'page' : undefined
                        }
                        className={`inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                          safeMinePage === pageNumber
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        onClick={() => setMinePage(pageNumber)}
                        type="button"
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      aria-label="Trang sau"
                      className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={safeMinePage >= mineTotalPages}
                      onClick={() =>
                        setMinePage((prev) =>
                          Math.min(mineTotalPages, prev + 1),
                        )
                      }
                      type="button"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <CreateHrRequestCard
              onCreated={() => setMinePage(1)}
              requesterCode={subtitleCode}
              requesterName={subtitleUserName}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {!isAdmin && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
                role="status"
              >
                Bạn đang ở chế độ chỉ xem ({effectiveRoleLabel}). Chỉ Quản trị viên (Admin) mới có quyền phê duyệt hoặc từ chối yêu cầu.
              </div>
            )}

            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5 min-w-0">
                <Card padding="lg" title="Yêu cầu cần xét duyệt">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <SearchIcon size={16} />
                      </div>
                      <input
                        aria-label="Tìm mã đơn hoặc lý do cần duyệt"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-indigo-50/40 py-2.5 pr-4 pl-10 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                        onChange={(event) =>
                          setApprovalSearch(event.target.value)
                        }
                        placeholder="Tìm mã đơn hoặc lý do…"
                        type="text"
                        value={approvalSearch}
                      />
                    </div>

                    <div className="w-full shrink-0 sm:w-40">
                      <SelectBox
                        hideLabel
                        label="Lọc theo tháng"
                        onChange={setApprovalMonth}
                        options={HR_REQUEST_MONTH_OPTIONS}
                        searchable={false}
                        value={approvalMonth}
                      />
                    </div>

                    <div className="w-full shrink-0 sm:w-44">
                      <SelectBox
                        hideLabel
                        label="Lọc theo trạng thái"
                        onChange={(value) =>
                          setApprovalStatus(value as HrRequestStatus | '')
                        }
                        options={HR_REQUEST_STATUS_OPTIONS}
                        searchable={false}
                        value={approvalStatus}
                      />
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead>
                        <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                          <th className="rounded-l-lg px-3 py-3">
                            Mã đơn / Loại
                          </th>
                          <th className="px-3 py-3">Ngày / Ca</th>
                          <th className="px-3 py-3">Người thay thế</th>
                          <th className="rounded-r-lg px-3 py-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {approvalQueue.length === 0 ? (
                          <tr>
                            <td
                              className="py-10 text-center text-slate-500"
                              colSpan={4}
                            >
                              Không có đơn nào phù hợp bộ lọc.
                            </td>
                          </tr>
                        ) : (
                          approvalQueue.map((item) => {
                            const isSelected = selectedRequest?.id === item.id
                            return (
                              <tr
                                key={item.id}
                                className={cn(
                                  'cursor-pointer transition-colors',
                                  isSelected
                                    ? 'bg-indigo-50/70'
                                    : 'hover:bg-slate-50/70',
                                )}
                                onClick={() => setSelectedRequestId(item.id)}
                              >
                                <td className="px-3 py-3.5 align-top">
                                  <button
                                    className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSelectedRequestId(item.id)
                                    }}
                                    type="button"
                                  >
                                    <div className="font-semibold text-slate-900">
                                      {item.code}
                                    </div>
                                    <div className="mt-0.5 text-[11px] font-medium text-slate-700">
                                      {HR_REQUEST_TYPE_SHORT_LABELS[item.type]} ·{' '}
                                      {item.requesterName}
                                    </div>
                                  </button>
                                </td>
                                <td className="px-3 py-3.5 align-top text-slate-600">
                                  {item.dateShiftSummary}
                                </td>
                                <td className="px-3 py-3.5 align-top text-slate-600">
                                  {item.replacementName}
                                </td>
                                <td className="px-3 py-3.5 align-top text-slate-600">
                                  {HR_REQUEST_STATUS_LABELS[item.status]}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    Hiển thị {approvalQueue.length === 0 ? 0 : 1}–{approvalQueue.length} trong {approvalQueue.length} đơn cần duyệt
                  </div>
                </Card>

                <ApprovalHistoryCard request={selectedRequest} />
              </div>

              <ApprovalRequestDetailCard
                isAdmin={isAdmin}
                key={selectedRequest?.id ?? 'none'}
                onReviewed={(updated) => setSelectedRequestId(updated.id)}
                request={selectedRequest}
                reviewerName={currentUser.name}
                reviewerRoleLabel={effectiveRoleLabel}
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
