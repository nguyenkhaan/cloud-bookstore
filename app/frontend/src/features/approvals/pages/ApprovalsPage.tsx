import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { Button, SelectBox, StatCard } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { useApprovalsQuery, useApprovalsStatsQuery } from '../approvals.hook'
import {
  approvalStatusMeta,
  copyStatusLabel,
  formatDateTime,
  varianceMeta,
} from '../approvals.presentation'
import type { InventoryAdjustmentQuery, InventoryAdjustmentStatus } from '../approvals.type'
import { AdjustmentDetailDrawer } from '../components/AdjustmentDetailDrawer'
import { CreateAdjustmentModal } from '../components/CreateAdjustmentModal'

type TabKey = 'old-book-price' | 'damage-penalty' | 'inventory-adjustment' | 'disposal-reversal'

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('inventory-adjustment')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InventoryAdjustmentStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const queryParams: InventoryAdjustmentQuery = {
    page,
    pageSize,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  }

  const { data: pageResult, isLoading } = useApprovalsQuery(queryParams)
  const { data: stats } = useApprovalsStatsQuery()

  const currentUser = session?.user ?? { name: 'Nhân viên', role: 'Chưa xác thực' }
  const currentUserId = session?.user?.email || session?.user?.name
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

  return (
    <MainLayout
      actionButton={
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            + Lập đề nghị điều chỉnh kho
          </Button>
        </div>
      }
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Phê duyệt', to: '/approvals' },
        { label: 'Trung tâm Phê duyệt ngoại lệ' },
      ]}
      currentPath="approvals"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle="Trung tâm Phê duyệt ngoại lệ"
      user={currentUser}
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs text-slate-500">
            4 tab nghiệp vụ chuyên biệt: Duyệt giá mua cũ, phạt hư hỏng, điều chỉnh kho và xuất hủy / đảo bán
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            description="Tất cả nghiệp vụ"
            label="Chờ xử lý"
            value={stats?.pendingApproval ?? 0}
            valueColor={stats?.pendingApproval ? 'amber' : 'default'}
          />
          <StatCard
            description="Tất cả trạng thái"
            label="Tổng yêu cầu"
            value={stats?.total ?? 0}
            valueColor="indigo"
          />
          <StatCard
            description="Đã duyệt hoặc đã áp dụng vào kho"
            label="Đã duyệt & Áp dụng"
            value={(stats?.approved ?? 0) + (stats?.applied ?? 0)}
            valueColor="emerald"
          />
          <StatCard
            description="Từ chối hoặc người tạo hủy"
            label="Đã đóng / Từ chối"
            value={(stats?.rejected ?? 0) + (stats?.cancelled ?? 0)}
            valueColor="default"
          />
        </div>

        <nav aria-label="Tabs nghiệp vụ phê duyệt" className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'old-book-price'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('old-book-price')}
            type="button"
          >
            Duyệt Giá Thu mua Sách cũ Vượt Hạn mức
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'damage-penalty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('damage-penalty')}
            type="button"
          >
            Duyệt Phạt Hư hỏng Trả sách Ngoài Khung
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'inventory-adjustment'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('inventory-adjustment')}
            type="button"
          >
            Duyệt Điều chỉnh Kho sau Kiểm kê
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'disposal-reversal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            onClick={() => setActiveTab('disposal-reversal')}
            type="button"
          >
            Duyệt Xuất hủy Sách hỏng / Đảo Hóa đơn
          </button>
        </nav>

        {activeTab !== 'inventory-adjustment' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Phân hệ nghiệp vụ đang kết nối</h3>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng chuyển qua tab <strong>Duyệt Điều chỉnh Kho sau Kiểm kê</strong> để xử lý các yêu cầu điều chỉnh kho sách.
            </p>
          </div>
        ) : (
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
                      <th className="px-4 py-3 text-left" scope="col">Bản sách & Đầu sách</th>
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

      <AdjustmentDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
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
