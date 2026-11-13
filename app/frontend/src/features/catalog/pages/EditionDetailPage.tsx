import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ConfirmationDialog } from '@/components/common'
import { useAuth } from '@/features/auth/auth.hook'
import { catalogPaths } from '../catalog.route'
import { useAvailableReceiptLinesQuery, useCopiesQuery, useCreateCopyMutation, useDeleteEditionMutation, useEditionQuery, useTitleQuery, useUpdateEditionMutation, useUpdateEditionStatusMutation } from '../catalog.hook'
import { availabilityLabel, formatVnd } from '../catalog.presentation'
import type { CreateCopyRequest, UpdateEditionRequest } from '../catalog.type'
import { ActiveBadge, CopyStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { CopyEditorDialog } from '../components/CopyEditorDialog'
import { CoverTile } from '../components/CoverTile'
import { EditionEditorDialog } from '../components/EditionEditorDialog'
import { ErrorState, LoadingRows } from './SeriesListPage'

export default function EditionDetailPage() {
  const { editionId = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const canEdit = ['ADMIN', 'INVENTORY_MANAGER'].includes(session?.user?.roleCode ?? '')
  const [dialog, setDialog] = useState<'edit' | 'create-copy' | 'delete' | null>(null)
  const [actionError, setActionError] = useState('')
  const editionQuery = useEditionQuery(editionId)
  const copiesQuery = useCopiesQuery(editionId)
  const receiptLinesQuery = useAvailableReceiptLinesQuery(canEdit && dialog === 'create-copy' ? editionId : '')
  const createCopy = useCreateCopyMutation()
  const updateEdition = useUpdateEditionMutation()
  const updateStatus = useUpdateEditionStatusMutation()
  const deleteEdition = useDeleteEditionMutation()
  const edition = editionQuery.data
  const titleQuery = useTitleQuery(edition?.titleId ?? '')

  if (editionQuery.isLoading) return <CatalogWorkspace title="Chi tiết ấn bản"><LoadingRows /></CatalogWorkspace>
  if (!edition || editionQuery.error) return <CatalogWorkspace title="Chi tiết ấn bản"><ErrorState message="Không tìm thấy ấn bản yêu cầu." /></CatalogWorkspace>

  const copies = copiesQuery.data ?? []
  const displayName = edition.editionStatement || edition.publisher || 'Ấn bản'
  const handleDelete = async () => {
    setActionError('')
    try { await deleteEdition.mutateAsync(editionId); navigate(catalogPaths.titleDetail(edition.titleId)) }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể xóa ấn bản.') }
  }
  const handleStatus = async () => {
    setActionError('')
    try { await updateStatus.mutateAsync({ editionId, isActive: !edition.isActive }) }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể đổi trạng thái.') }
  }

  return <CatalogWorkspace
    action={canEdit && <div className="flex flex-wrap gap-2"><Button onClick={() => setDialog('edit')} variant="secondary">Chỉnh sửa</Button><Button onClick={() => { setActionError(''); setDialog('delete') }} variant="outline">Xóa</Button><Button disabled={!edition.isActive} onClick={() => setDialog('create-copy')}>Thêm bản vật lý</Button></div>}
    title={titleQuery.data?.name || 'Chi tiết ấn bản'}>
    {actionError && <p className="text-sm text-rose-700" role="alert">{actionError}</p>}
    <Card padding="none"><div className="flex flex-col gap-5 p-5 sm:flex-row">
      <CoverTile className="aspect-[3/4] w-28 shrink-0 rounded-lg border border-slate-200" imageUrl={edition.coverImageUrl} title={displayName} />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold text-slate-900">{displayName}</h2><ActiveBadge active={edition.isActive} /></div>
        <p className="mt-1 text-sm text-slate-500">{edition.publisher || 'Chưa có nhà xuất bản'}{edition.publishYear ? ` · ${edition.publishYear}` : ''}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><Fact label="ISBN" value={edition.isbn || 'Không ISBN'} /><Fact label="Lần in" value={edition.printingStatement || '—'} /><Fact label="Định dạng" value={edition.format || '—'} /><Fact label="Giá bìa" value={formatVnd(edition.coverPrice)} /></dl>
        {canEdit && <Button className="mt-4" disabled={updateStatus.isPending} onClick={() => void handleStatus()} variant="ghost">{edition.isActive ? 'Ngừng sử dụng ấn bản' : 'Kích hoạt lại'}</Button>}
      </div>
    </div></Card>
    <section aria-labelledby="copies-heading"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900" id="copies-heading">Bản sách vật lý</h2><span className="text-xs text-slate-500">{copies.filter((copy) => copy.status === 'AVAILABLE').length} sẵn sàng / {copies.length} bản</span></div>
      {copiesQuery.isLoading ? <LoadingRows /> : copiesQuery.error ? <ErrorState message="Không thể tải các bản vật lý." /> : <Card className="overflow-hidden" padding="none"><div className="overflow-x-auto"><table className="min-w-160 w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">CopyBarcode</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Kênh</th><th className="px-4 py-3">Giá bán / thuê</th><th className="px-4 py-3">Kệ</th></tr></thead><tbody className="divide-y divide-slate-100">{copies.map((copy) => <tr key={copy.id}><td className="px-4 py-3"><Link className="font-semibold text-indigo-700 hover:underline" to={catalogPaths.copyDetail(copy.id)}>{copy.copyBarcode}</Link></td><td className="px-4 py-3"><CopyStatusBadge status={copy.status} /></td><td className="px-4 py-3">{availabilityLabel(copy.availability)}</td><td className="px-4 py-3">{formatVnd(copy.sellingPrice)} / {formatVnd(copy.rentalRate)}</td><td className="px-4 py-3">{copy.shelfCode || '—'}</td></tr>)}</tbody></table></div>{!copies.length && <p className="p-6 text-sm text-slate-500">Chưa có bản vật lý.</p>}</Card>}
    </section>
    {dialog === 'edit' && <EditionEditorDialog edition={edition} onClose={() => setDialog(null)} onSave={async (request) => { await updateEdition.mutateAsync({ editionId, request: { ...request, minStockSale: edition.minStockSale, minStockRental: edition.minStockRental } as UpdateEditionRequest }) }} titleId={edition.titleId} />}
    {dialog === 'create-copy' && (receiptLinesQuery.isLoading ? <LoadingRows /> : receiptLinesQuery.error ? <ErrorState message="Không thể tải dòng phiếu nhập khả dụng." /> : <CopyEditorDialog editionId={editionId} editionImageUrl={edition.coverImageUrl} onClose={() => setDialog(null)} onSave={async (request) => { await createCopy.mutateAsync(request as CreateCopyRequest) }} receiptLines={receiptLinesQuery.data ?? []} />)}
    {dialog === 'delete' && <ConfirmationDialog actions={<><Button onClick={() => setDialog(null)} variant="ghost">Hủy</Button><Button loading={deleteEdition.isPending} onClick={() => void handleDelete()} variant="danger">Xóa ấn bản</Button></>} error={actionError} message="Chỉ xóa được ấn bản chưa có bản sách hoặc dòng phiếu nhập. Nếu đã có lịch sử, hãy ngừng sử dụng." onClose={() => setDialog(null)} title="Xóa ấn bản" />}
  </CatalogWorkspace>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>
}
