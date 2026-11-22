import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { History, Info, Lock, RotateCcw, Search } from 'lucide-react'
import { Card, SelectBox } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { BookCopyLifecycleDrawer } from '@/features/catalog/components/BookCopyLifecycleDrawer'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { useAuditLogDetailQuery, useAuditLogsQuery, useAuditMetadataQuery } from '../audit.hook'
import { moduleDisplayLabel } from '../audit.presentation'
import { auditPaths } from '../audit.route'
import type { AuditLogFilters } from '../audit.type'
import { AuditDetailPanel } from '../components/AuditDetailPanel'
import { AuditRelatedTimeline } from '../components/AuditRelatedTimeline'
import { AuditTable } from '../components/AuditTable'

const DEFAULT_PAGE_SIZE = 10

export default function AuditPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const roleCode = session?.user?.roleCode ?? ''
  const isInventoryManager = roleCode === 'INVENTORY_MANAGER'

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [drawerCopyId, setDrawerCopyId] = useState<string | null>(null)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  const filters = useMemo<AuditLogFilters>(
    () => ({
      search: debouncedSearch || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [debouncedSearch, entityType, action, fromDate, toDate, page],
  )

  const logsQuery = useAuditLogsQuery(filters)
  const metadataQuery = useAuditMetadataQuery()

  const items = useMemo(() => logsQuery.data?.items ?? [], [logsQuery.data?.items])
  const totalCount = Number(logsQuery.data?.totalCount ?? 0)
  const totalPages = Math.max(1, Number(logsQuery.data?.totalPages ?? 1))

  const effectiveSelectedId = useMemo(() => {
    if (selectedLogId && items.some((x) => x.id === selectedLogId)) {
      return selectedLogId
    }
    return items[0]?.id ?? null
  }, [items, selectedLogId])

  const detailQuery = useAuditLogDetailQuery(effectiveSelectedId)
  const detailLog =
    detailQuery.data?.log ?? items.find((x) => x.id === effectiveSelectedId) ?? null
  const relatedEvents = detailQuery.data?.relatedEvents ?? []

  const entityTypes = metadataQuery.data?.entityTypes ?? []
  const actions = metadataQuery.data?.actions ?? []

  const hasActiveFilters = Boolean(searchInput || entityType || action || fromDate || toDate)

  const resetFilters = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setEntityType('')
    setAction('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <MainLayout
      currentPath="audit"
      onNavigate={(id) => {
        const target = workspacePathFor(id)
        if (target) navigate(target)
      }}
      onSignOut={signOut}
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Nhật ký kiểm toán' },
        { label: 'Nhật ký kiểm toán hệ thống' },
      ]}
      screenCode="SCR-AUD-01 / NHẬT KÝ KIỂM TOÁN"
      pageTitle="Nhật ký kiểm toán hệ thống"
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Read-only · Không sửa / xóa
          </span>
          <Link
            to={auditPaths.copyLifecycle}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-indigo-700"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Tra cứu bản sách 360°
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500">
          Truy vết bất biến · Chỉ đọc · Thời gian chính xác tới mili-giây (UTC+7)
        </p>

        {/* Immutability / RBAC scope notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
          <span>
            {isInventoryManager
              ? 'Mọi bản ghi được bảo toàn. Quản lý kho chỉ tra cứu các nhật ký thuộc nghiệp vụ kho, đầu sách, ấn bản, bản sách và kiểm kê; không có quyền chỉnh sửa hoặc xóa.'
              : 'Mọi bản ghi được bảo toàn. Admin và Quản lý chỉ được tra cứu, không có quyền chỉnh sửa hoặc xóa Nhật ký kiểm toán.'}
          </span>
        </div>

        {/* Search & Filters + Audit Log Table */}
        <Card title="Tra cứu nhật ký">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="relative xl:col-span-5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="audit-search-input" className="sr-only">
                Tìm tài khoản, mã chứng từ hoặc nội dung thay đổi
              </label>
              <input
                id="audit-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm tài khoản, mã chứng từ hoặc nội dung thay đổi..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 xl:col-span-3">
              <div>
                <label htmlFor="audit-from-date" className="sr-only">
                  Từ ngày
                </label>
                <input
                  id="audit-from-date"
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
                <label htmlFor="audit-to-date" className="sr-only">
                  Đến ngày
                </label>
                <input
                  id="audit-to-date"
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
                label="Lọc theo phân hệ"
                hideLabel
                value={entityType}
                onChange={(val) => {
                  setEntityType(val)
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Phân hệ: Tất cả' },
                  ...entityTypes.map((type) => ({
                    value: type,
                    label: `${moduleDisplayLabel(type)} (${type})`,
                  })),
                ]}
              />
            </div>

            <div className="flex gap-2 xl:col-span-2">
              <SelectBox
                label="Lọc theo hành động"
                hideLabel
                className="min-w-0 flex-1"
                value={action}
                onChange={(val) => {
                  setAction(val)
                  setPage(1)
                }}
                options={[
                  { value: '', label: 'Hành động: Tất cả' },
                  ...actions.map((act) => ({ value: act, label: act })),
                ]}
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Đặt lại bộ lọc"
                  aria-label="Đặt lại bộ lọc"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {logsQuery.isError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : 'Không thể tải danh sách nhật ký kiểm toán.'}
            </div>
          )}

          <AuditTable
            items={items}
            selectedId={effectiveSelectedId}
            totalCount={totalCount}
            page={page}
            pageSize={DEFAULT_PAGE_SIZE}
            totalPages={totalPages}
            isLoading={logsQuery.isLoading}
            onSelectLog={(id) => setSelectedLogId(id)}
            onPageChange={(nextPage) => setPage(nextPage)}
            onOpenCopyLifecycle={(copyId) => setDrawerCopyId(copyId)}
          />
        </Card>

        {/* Bottom 2-column detail + related events */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AuditDetailPanel
              log={detailLog}
              isLoading={detailQuery.isLoading && !detailLog}
              onOpenCopyLifecycle={(copyId) => setDrawerCopyId(copyId)}
            />
          </div>

          <div>
            <AuditRelatedTimeline
              selectedId={effectiveSelectedId}
              relatedEvents={relatedEvents}
              isLoading={detailQuery.isLoading}
              onSelectEvent={(id) => setSelectedLogId(id)}
            />
          </div>
        </div>
      </div>

      <BookCopyLifecycleDrawer
        copyId={drawerCopyId}
        onClose={() => setDrawerCopyId(null)}
      />
    </MainLayout>
  )
}
