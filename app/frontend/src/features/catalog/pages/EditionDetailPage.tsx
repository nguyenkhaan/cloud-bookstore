import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card } from '@/components/common'
import { catalogPaths } from '../catalog.route'
import { useCopiesQuery, useCreateCopyMutation, useEditionQuery, useTitleQuery } from '../catalog.hook'
import { availabilityLabel, formatVnd } from '../catalog.presentation'
import { CopyStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { CopyEditorDialog } from '../components/CopyEditorDialog'
import { ErrorState, LoadingRows } from './SeriesListPage'

export default function EditionDetailPage() {
  const { editionId = '' } = useParams()
  const [isCopyEditorOpen, setIsCopyEditorOpen] = useState(false)
  const editionQuery = useEditionQuery(editionId)
  const copiesQuery = useCopiesQuery(editionId)
  const createCopy = useCreateCopyMutation()
  const edition = editionQuery.data
  const titleQuery = useTitleQuery(edition?.titleId ?? '')

  if (editionQuery.isLoading) return <CatalogWorkspace description="Đang tải thông tin ấn bản…" screenCode="SCR-INV-03 / KHO SÁCH" title="Chi tiết ấn bản"><LoadingRows /></CatalogWorkspace>
  if (!edition || editionQuery.error) return <CatalogWorkspace description="Không thể mở thông tin ấn bản." screenCode="SCR-INV-03 / KHO SÁCH" title="Chi tiết ấn bản"><ErrorState message="Không tìm thấy ấn bản yêu cầu." /></CatalogWorkspace>

  const copies = copiesQuery.data ?? []
  const availableCopies = copies.filter((copy) => copy.status === 'AVAILABLE').length

  return (
    <CatalogWorkspace
      action={<Button onClick={() => setIsCopyEditorOpen(true)}>+ Thêm bản vật lý</Button>}
      description=""
      screenCode="SCR-INV-03 / KHO SÁCH"
      title={titleQuery.data?.name || 'Chi tiết ấn bản'}
    >
      <Card padding="none">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><Fact label="ISBN" value={edition.isbn || 'Không ISBN'} /><Fact label="Nhà xuất bản" value={edition.publisher || '—'} /><Fact label="Năm / định dạng" value={[edition.publishYear, edition.format].filter(Boolean).join(' • ') || '—'} /><Fact label="Giá bìa" value={formatVnd(edition.coverPrice)} /></div>
      </Card>
      <section aria-labelledby="copies-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.14em] text-indigo-600">CẤP 4 / BẢN VẬT LÝ</p><h2 className="mt-1 text-base font-bold text-slate-900" id="copies-heading">Từng cuốn sách trong kho</h2></div><p className="text-xs text-slate-500"><strong className="text-emerald-700">{availableCopies}</strong> sẵn sàng / {copies.length} bản</p></div>
        {copiesQuery.isLoading ? <LoadingRows /> : copiesQuery.error ? <ErrorState message="Không thể tải các bản vật lý." /> : (
          <Card className="overflow-hidden" padding="none"><div className="overflow-x-auto"><table className="min-w-180 w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-bold">CopyBarcode</th><th className="px-4 py-3 font-bold">Tình trạng</th><th className="px-4 py-3 font-bold">Kênh</th><th className="px-4 py-3 font-bold">Giá bán / thuê</th><th className="px-4 py-3 font-bold">Vị trí kệ</th></tr></thead><tbody className="divide-y divide-slate-100">{copies.map((copy) => <tr className="transition hover:bg-slate-50" key={copy.id}><td className="px-4 py-3"><Link className="font-bold text-indigo-700 hover:text-indigo-900" to={catalogPaths.copyDetail(copy.id)}>{copy.copyBarcode}</Link><p className="mt-1 text-[11px] text-slate-500">Hạng {copy.conditionGrade}</p></td><td className="px-4 py-3"><CopyStatusBadge status={copy.status} /></td><td className="px-4 py-3 text-slate-600">{availabilityLabel(copy.availability)}</td><td className="px-4 py-3 text-slate-600">{formatVnd(copy.sellingPrice)} <span className="text-slate-400">/</span> {formatVnd(copy.rentalRate)}</td><td className="px-4 py-3 font-semibold text-slate-600">{copy.shelfCode || 'Chưa xếp kệ'}</td></tr>)}</tbody></table></div>{!copies.length && <div className="p-8 text-center text-sm text-slate-500">Chưa có bản vật lý. Thêm cuốn đầu tiên sau khi xác nhận ấn bản.</div>}</Card>
        )}
      </section>
      {isCopyEditorOpen && <CopyEditorDialog editionId={editionId} onClose={() => setIsCopyEditorOpen(false)} onSave={async (request) => { await createCopy.mutateAsync(request) }} />}
    </CatalogWorkspace>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-bold text-slate-800" title={value}>{value}</p></div>
}
