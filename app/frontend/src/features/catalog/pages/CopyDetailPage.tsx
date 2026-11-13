import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ConfirmationDialog } from '@/components/common'
import { useAuth } from '@/features/auth/auth.hook'
import { catalogPaths } from '../catalog.route'
import { useCopyQuery, useDeleteCopyMutation, useEditionQuery, useTitleQuery, useUpdateCopyMutation, useUpdateCopyStatusMutation } from '../catalog.hook'
import { availabilityLabel, formatVnd } from '../catalog.presentation'
import type { UpdateCopyRequest } from '../catalog.type'
import { CopyStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { CopyEditorDialog } from '../components/CopyEditorDialog'
import { CoverTile } from '../components/CoverTile'
import { ErrorState, LoadingRows } from './SeriesListPage'

export default function CopyDetailPage() {
  const { copyId = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const canEdit = ['ADMIN', 'INVENTORY_MANAGER'].includes(session?.user?.roleCode ?? '')
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)
  const [actionError, setActionError] = useState('')
  const copyQuery = useCopyQuery(copyId)
  const copy = copyQuery.data
  const editionQuery = useEditionQuery(copy?.editionId ?? '')
  const titleQuery = useTitleQuery(editionQuery.data?.titleId ?? '')
  const updateCopy = useUpdateCopyMutation()
  const updateStatus = useUpdateCopyStatusMutation()
  const deleteCopy = useDeleteCopyMutation()

  if (copyQuery.isLoading) return <CatalogWorkspace title="Bản sách vật lý"><LoadingRows /></CatalogWorkspace>
  if (!copy || copyQuery.error) return <CatalogWorkspace title="Bản sách vật lý"><ErrorState message="Không tìm thấy bản sách yêu cầu." /></CatalogWorkspace>

  const handleDelete = async () => {
    setActionError('')
    try { await deleteCopy.mutateAsync(copyId); navigate(catalogPaths.editionDetail(copy.editionId)) }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể xóa bản sách.') }
  }
  const handleDiscontinue = async () => {
    setActionError('')
    try { await updateStatus.mutateAsync({ copyId, request: { status: 'DISCONTINUED', reason: 'Ngừng sử dụng từ trang chi tiết bản sách' } }); setDialog(null) }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể ngừng sử dụng bản sách.') }
  }
  const canDiscontinue = !['RENTED', 'SOLD', 'DISPOSED', 'DISCONTINUED'].includes(copy.status)

  return <CatalogWorkspace
    action={canEdit && <div className="flex flex-wrap gap-2"><Button onClick={() => setDialog('edit')} variant="secondary">Chỉnh sửa</Button><Button onClick={() => { setActionError(''); setDialog('delete') }} variant="outline">Xóa</Button>{canDiscontinue && <Button disabled={updateStatus.isPending} onClick={() => void handleDiscontinue()} variant="ghost">Ngừng sử dụng</Button>}</div>}
    title={copy.copyBarcode}>
    {actionError && <p className="text-sm text-rose-700" role="alert">{actionError}</p>}
    <Card padding="none"><div className="flex flex-col gap-5 p-5 sm:flex-row">
      <CoverTile className="aspect-[3/4] w-28 shrink-0 rounded-lg border border-slate-200" imageUrl={copy.imageUrl || copy.editionImageUrl || editionQuery.data?.coverImageUrl} title={copy.copyBarcode} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold text-slate-900">{copy.copyBarcode}</h2><CopyStatusBadge status={copy.status} /></div>
        <p className="mt-1 text-sm text-slate-600">{titleQuery.data?.name || 'Bản sách vật lý'}</p>
        <Link className="mt-2 inline-block text-sm font-semibold text-indigo-700 hover:underline" to={catalogPaths.editionDetail(copy.editionId)}>Xem ấn bản →</Link>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><Detail label="Tình trạng" value={copy.conditionGrade} /><Detail label="Kênh sử dụng" value={availabilityLabel(copy.availability)} /><Detail label="Giá bán" value={formatVnd(copy.sellingPrice)} /><Detail label="Giá thuê" value={formatVnd(copy.rentalRate)} /><Detail label="Vị trí kệ" value={copy.shelfCode || '—'} /></dl>
        {copy.conditionNote && <p className="mt-5 text-sm leading-6 text-slate-600">{copy.conditionNote}</p>}
      </div>
    </div></Card>
    {dialog === 'edit' && <CopyEditorDialog copy={copy} editionId={copy.editionId} editionImageUrl={copy.editionImageUrl || editionQuery.data?.coverImageUrl} onClose={() => setDialog(null)} onSave={async (request) => { await updateCopy.mutateAsync({ copyId, request: request as UpdateCopyRequest }) }} />}
    {dialog === 'delete' && <ConfirmationDialog actions={<><Button onClick={() => setDialog(null)} variant="ghost">Hủy</Button><Button loading={deleteCopy.isPending} onClick={() => void handleDelete()} variant="danger">Xóa bản sách</Button></>} error={actionError} message="Chỉ xóa hẳn bản chưa có lịch sử bán, thuê hoặc kiểm kê. Nếu đã có lịch sử, hãy ngừng sử dụng; bản đã bán tự không còn khả dụng." onClose={() => setDialog(null)} title={`Xóa ${copy.copyBarcode}`} />}
  </CatalogWorkspace>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>
}
