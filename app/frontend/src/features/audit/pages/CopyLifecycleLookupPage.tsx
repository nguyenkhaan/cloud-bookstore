import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Barcode, History, Search } from 'lucide-react'
import { privateClient } from '@/api/client'
import { Badge, Button, Card } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { copyStatusMeta, formatVnd } from '@/features/catalog/catalog.presentation'
import { getCopyByBarcode } from '@/features/catalog/catalog.service'
import type { BookCopy } from '@/features/catalog/catalog.type'
import { BookCopyLifecycleDrawer } from '@/features/catalog/components/BookCopyLifecycleDrawer'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { auditPaths } from '../audit.route'

type PagedBookCopiesResponse = {
  items?: BookCopy[]
  totalCount?: number
}

export default function CopyLifecycleLookupPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null)
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null)

  const recentCopiesQuery = useQuery({
    queryKey: ['audit', 'copy-lifecycle', 'recent', barcodeInput.trim()],
    queryFn: async () => {
      const response = await privateClient.get<PagedBookCopiesResponse>('/book-copies', {
        params: {
          Page: 1,
          PageSize: 12,
          ...(barcodeInput.trim() ? { CopyBarcode: barcodeInput.trim() } : {}),
        },
      })
      return response.data.items ?? []
    },
  })

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault()
    const code = barcodeInput.trim()
    if (!code) {
      setSearchError('Vui lòng nhập mã vạch bản sách (VD: BC-0082918).')
      return
    }

    setSearchError(null)
    setIsLookingUp(true)
    try {
      const copy = await getCopyByBarcode(code)
      setSelectedCopy(copy)
      setSelectedCopyId(copy.id)
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : `Không tìm thấy bản sách với mã vạch "${code}".`,
      )
    } finally {
      setIsLookingUp(false)
    }
  }

  const copies = recentCopiesQuery.data ?? []

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
        { label: 'Nhật ký kiểm toán', to: auditPaths.root },
        { label: 'Tra cứu bản sách 360°' },
      ]}
      screenCode="DRAWER-INV-03 / TRA CỨU VÒNG ĐỜI BẢN SÁCH"
      pageTitle="Tra cứu Lịch sử Vòng đời Bản sách 360°"
      actionButton={
        <Link
          to={auditPaths.root}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại Nhật ký kiểm toán
        </Link>
      }
    >
      <div className="space-y-6">
        <Card
          title="Tìm nhanh theo mã vạch bản sách (CopyBarcode)"
          subtitle="Nhập hoặc quét mã vạch bản sách để mở ngăn kéo vòng đời 360°, in lại tem dán gáy và chuyển vị trí kệ."
        >
          <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Barcode
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="copy-barcode-lookup" className="sr-only">
                Mã vạch bản sách
              </label>
              <input
                id="copy-barcode-lookup"
                type="text"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value)
                  if (searchError) setSearchError(null)
                }}
                placeholder="Nhập mã vạch bản sách (VD: BC-0082918)..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <Button type="submit" disabled={isLookingUp} className="min-h-11 shrink-0">
              <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isLookingUp ? 'Đang tra cứu...' : 'Mở vòng đời 360°'}
            </Button>
          </form>

          {searchError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700"
            >
              {searchError}
            </div>
          )}
        </Card>

        <Card
          title="Bản sách trong kho"
          subtitle="Chọn trực tiếp một bản sách bên dưới để mở Drawer DRAWER-INV-03."
        >
          {recentCopiesQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : copies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
              Không tìm thấy bản sách phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {copies.map((copy) => {
                const statusMeta = copyStatusMeta[copy.status] ?? { label: copy.status, variant: 'neutral' as const }
                return (
                  <button
                    key={copy.id}
                    type="button"
                    onClick={() => {
                      setSelectedCopy(copy)
                      setSelectedCopyId(copy.id)
                    }}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-900">
                          {copy.copyBarcode}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                          {copy.titleName || 'Đầu sách'}
                          {copy.volumeLabel ? ` · ${copy.volumeLabel}` : ''}
                        </div>
                      </div>
                      <Badge variant={statusMeta.variant} size="xs">
                        {statusMeta.label} (Grade {copy.conditionGrade})
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Kệ: {copy.shelfCode || 'Chưa gán'}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        {copy.sellingPrice != null ? formatVnd(copy.sellingPrice) : 'Xem 360°'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <BookCopyLifecycleDrawer
        copyId={selectedCopyId}
        initialCopy={selectedCopy}
        onClose={() => {
          setSelectedCopyId(null)
          setSelectedCopy(null)
        }}
      />
    </MainLayout>
  )
}
