import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { Button, SelectBox, StatCard } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import {
  useApprovalsOverviewStatsQuery,
  useApprovalsQuery,
  useApprovalsStatsQuery,
} from '../approvals.hook'
import {
  approvalStatusMeta,
  copyStatusLabel,
  formatDateTime,
  varianceMeta,
} from '../approvals.presentation'
import type { InventoryAdjustmentQuery, InventoryAdjustmentStatus } from '../approvals.type'
import { AdjustmentDetailDrawer } from '../components/AdjustmentDetailDrawer'
import { BuybackApprovalsTable } from '../components/BuybackApprovalsTable'
import { BuybackDetailDrawer } from '../components/BuybackDetailDrawer'
import { CreateAdjustmentModal } from '../components/CreateAdjustmentModal'
import { DamagePenaltyApprovalsTable } from '../components/DamagePenaltyApprovalsTable'
import { DamagePenaltyDetailDrawer } from '../components/DamagePenaltyDetailDrawer'
import { DisposalReversalApprovalsTable } from '../components/DisposalReversalApprovalsTable'
import { DisposalReversalDetailDrawer } from '../components/DisposalReversalDetailDrawer'

type TabKey = 'old-book-price' | 'damage-penalty' | 'inventory-adjustment' | 'disposal-reversal'

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('inventory-adjustment')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InventoryAdjustmentStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Selected IDs for drawers
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedBuybackId, setSelectedBuybackId] = useState<string | null>(null)
  const [selectedDamageId, setSelectedDamageId] = useState<string | null>(null)
  const [selectedDisposalId, setSelectedDisposalId] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const queryParams: InventoryAdjustmentQuery = {
    page,
    pageSize,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  }

  const { data: pageResult, isLoading } = useApprovalsQuery(queryParams)
  const { data: stats } = useApprovalsStatsQuery()
  const { data: overviewStats } = useApprovalsOverviewStatsQuery()

  const currentUser = session?.user ?? { name: 'Nhân viên', role: 'Chưa xác thực' }
  const currentUserId = session?.user?.name
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.roleCode ?? '')

  const navigateFromSidebar = (item: string) => {
    const path = workspacePathFor(item)
    if (path) navigate(path)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pageResult?.totalPages ?? 1)) {
      setPage(newPage)
    }
  }

  // Aggregate KPI stats from overviewStats or fallback to stats
  const pendingCount = overviewStats?.pendingCount ?? stats?.pendingApproval ?? 0
  const totalCount = overviewStats?.totalCount ?? stats?.total ?? 0
  const approvedCount = overviewStats?.approvedCount ?? ((stats?.approved ?? 0) + (stats?.applied ?? 0))
  const rejectedCount = overviewStats?.rejectedCount ?? ((stats?.rejected ?? 0) + (stats?.cancelled ?? 0))

  return (
    <MainLayout
      actionButton={
        activeTab === 'inventory-adjustment' ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
            >
              + Lập đề nghị điều chỉnh kho
            </Button>
          </div>
        ) : undefined
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Phê duyệt', to: '/approvals' },
        { label: 'Trung tâm Phê duyệt ngoại lệ (SCR-APP-01)' },
      ]}
      currentPath="approvals"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle="Trung tâm Phê duyệt ngoại lệ (SCR-APP-01)"
      user={currentUser}
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs text-slate-500">
            Không gian phê duyệt tập trung dành riêng cho Quản lý &amp; Admin: Duyệt giá mua cũ, phạt hư hỏng, điều chỉnh kho và xuất hủy / đảo bán
          </p>
        </div>

        {/* 4 StatCards KPI Overview */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            description="Tất cả 4 phân hệ ngoại lệ"
            label="Chờ xử lý"
            value={pendingCount}
            valueColor={pendingCount > 0 ? 'amber' : 'default'}
          />
          <StatCard
            description="Tất cả trạng thái"
            label="Tổng yêu cầu"
            value={totalCount}
            valueColor="indigo"
          />
          <StatCard
            description="Đã duyệt hoặc đã áp dụng"
            label="Đã duyệt & Áp dụng"
            value={approvedCount}
            valueColor="emerald"
          />
          <StatCard
            description="Từ chối hoặc đã hủy"
            label="Đã đóng / Từ chối"
            value={rejectedCount}
            valueColor="default"
          />
        </div>

        {/* 4 Specialized Approval Tabs */}
        <nav aria-label="Tabs nghiệp vụ phê duyệt" className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition inline-flex items-center gap-2 ${
              activeTab === 'old-book-price'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('old-book-price')}
            type="button"
          >
            <span>Duyệt Giá Thu mua Sách cũ Vượt Hạn mức</span>
            {(overviewStats?.buybackPending ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'old-book-price' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {overviewStats?.buybackPending}
              </span>
            )}
          </button>

          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition inline-flex items-center gap-2 ${
              activeTab === 'damage-penalty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('damage-penalty')}
            type="button"
          >
            <span>Duyệt Phạt Hư hỏng Trả sách Ngoài Khung</span>
            {(overviewStats?.damagePenaltyPending ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'damage-penalty' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {overviewStats?.damagePenaltyPending}
              </span>
            )}
          </button>

          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition inline-flex items-center gap-2 ${
              activeTab === 'inventory-adjustment'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('inventory-adjustment')}
            type="button"
          >
            <span>Duyệt Điều chỉnh Kho sau Kiểm kê</span>
            {((overviewStats?.inventoryAdjustmentPending ?? stats?.pendingApproval) ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'inventory-adjustment' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {overviewStats?.inventoryAdjustmentPending ?? stats?.pendingApproval}
              </span>
            )}
          </button>

          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition inline-flex items-center gap-2 ${
              activeTab === 'disposal-reversal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('disposal-reversal')}
            type="button"
          >
            <span>Duyệt Xuất hủy Sách hỏng / Đảo Hóa đơn</span>
            {(overviewStats?.disposalReversalPending ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'disposal-reversal' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {overviewStats?.disposalReversalPending}
              </span>
            )}
          </button>
        </nav>

        {/* Tab 1 Content: Duyệt Giá Thu mua Sách cũ */}
        {activeTab === 'old-book-price' && (
          <BuybackApprovalsTable onSelectRequest={(id) => setSelectedBuybackId(id)} />
        )}

        {/* Tab 2 Content: Duyệt Phạt Hư hỏng Ngoài Khung */}
        {activeTab === 'damage-penalty' && (
          <DamagePenaltyApprovalsTable onSelectRequest={(id) => setSelectedDamageId(id)} />
        )}

        {/* Tab 4 Content: Duyệt Xuất hủy & Đảo Hóa đơn */}
        {activeTab === 'disposal-reversal' && (
          <DisposalReversalApprovalsTable onSelectRequest={(id) => setSelectedDisposalId(id)} />
        )}

        {/* Tab 3 Content: Duyệt Điều chỉnh Kho sau Kiểm kê */}
        {activeTab === 'inventory-adjustment' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Tìm theo mã yêu cầu, barcode, tên đầu sách..."
                    type="search"
                    value={search}
                  />
                  <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>

                <div className="w-44">
                  <SelectBox
                    hideLabel
                    label="Lọc theo trạng thái"
                    onChange={(val) => {
                      setStatusFilter(val as InventoryAdjustmentStatus | '')
                      setPage(1)
                    }}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
                      { value: 'APPROVED', label: 'Đã duyệt' },
                      { value: 'APPLIED', label: 'Đã áp dụng kho' },
                      { value: 'REJECTED', label: 'Từ chối' },
                      { value: 'CANCELLED', label: 'Đã hủy' },
                    ]}
                    searchable={false}
                    value={statusFilter}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Tổng cộng: <strong className="text-slate-900">{pageResult?.totalCount ?? 0}</strong> yêu cầu
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left" scope="col">Mã yêu cầu</th>
                      <th className="px-4 py-3 text-left" scope="col">Bản sách &amp; Đầu sách</th>
                      <th className="px-3 py-3 text-left" scope="col">Loại sai lệch</th>
                      <th className="px-3 py-3 text-left" scope="col">Đề xuất trạng thái</th>
                      <th className="px-4 py-3 text-left" scope="col">Lý do giải trình</th>
                      <th className="px-3 py-3 text-left" scope="col">Người lập</th>
                      <th className="px-3 py-3 text-left" scope="col">Ngày gửi</th>
                      <th className="px-3 py-3 text-left" scope="col">Trạng thái</th>
                      <th className="px-4 py-3 text-right" scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-slate-400" colSpan={9}>
                          Đang tải danh sách yêu cầu điều chỉnh...
                        </td>
                      </tr>
                    ) : !pageResult?.items || pageResult.items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-slate-500" colSpan={9}>
                          <p className="font-semibold text-slate-700">Không có yêu cầu điều chỉnh nào</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Nhấn nút &ldquo;+ Lập đề nghị điều chỉnh kho&rdquo; để tạo yêu cầu mới.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      pageResult.items.map((item) => (
                        <tr
                          className="hover:bg-indigo-50/40 cursor-pointer transition"
                          key={item.id}
                          onClick={() => setSelectedRequestId(item.id)}
                        >
                          <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {item.requestCode}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-semibold text-slate-900 block">{item.copyBarcode}</span>
                            <span className="text-slate-500 truncate block max-w-xs">{item.titleName}</span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${varianceMeta(item.varianceType).className}`}>
                              {varianceMeta(item.varianceType).label}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <span className="text-slate-500">{copyStatusLabel(item.originalStatus)}</span>
                              <span>→</span>
                              <span className="font-semibold text-indigo-700">{copyStatusLabel(item.requestedStatus)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs truncate text-slate-700" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">
                            {item.requestedByName || item.requestedBy}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap text-slate-500">
                            {formatDateTime(item.requestedAt)}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${approvalStatusMeta(item.status).className}`}>
                              {approvalStatusMeta(item.status).label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRequestId(item.id)
                              }}
                              variant="outline"
                            >
                              Chi tiết
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pageResult && pageResult.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Trang <strong className="text-slate-900">{pageResult.page}</strong> / {pageResult.totalPages} (Tổng {pageResult.totalCount} bản ghi)
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      disabled={pageResult.page <= 1}
                      onClick={() => handlePageChange(pageResult.page - 1)}
                      variant="outline"
                    >
                      Trước
                    </Button>
                    <Button
                      disabled={pageResult.page >= pageResult.totalPages}
                      onClick={() => handlePageChange(pageResult.page + 1)}
                      variant="outline"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawers and Modals for each category */}
      <BuybackDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedBuybackId(null)}
        requestId={selectedBuybackId}
      />

      <DamagePenaltyDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedDamageId(null)}
        requestId={selectedDamageId}
      />

      <AdjustmentDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />

      <DisposalReversalDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedDisposalId(null)}
        requestId={selectedDisposalId}
      />

      <CreateAdjustmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          notify.success('Đã gửi đề nghị điều chỉnh kho sang Trung tâm Phê duyệt thành công.')
        }}
      />
    </MainLayout>
  )
}
