import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/common'
import { catalogPaths } from '../catalog.route'
import { useCopyQuery, useEditionQuery, useTitleQuery } from '../catalog.hook'
import { availabilityLabel, formatVnd } from '../catalog.presentation'
import { CopyStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { ErrorState, LoadingRows } from './SeriesListPage'

export default function CopyDetailPage() {
  const { copyId = '' } = useParams()
  const copyQuery = useCopyQuery(copyId)
  const copy = copyQuery.data
  const editionQuery = useEditionQuery(copy?.editionId ?? '')
  const titleQuery = useTitleQuery(editionQuery.data?.titleId ?? '')

  if (copyQuery.isLoading) return <CatalogWorkspace description="Đang tải bản sách vật lý…" screenCode="SCR-INV-03 / KHO SÁCH" title="Bản sách vật lý"><LoadingRows /></CatalogWorkspace>
  if (!copy || copyQuery.error) return <CatalogWorkspace description="Không thể mở bản sách vật lý yêu cầu." screenCode="SCR-INV-03 / KHO SÁCH" title="Bản sách vật lý"><ErrorState message="Không tìm thấy CopyBarcode yêu cầu." /></CatalogWorkspace>

  return (
    <CatalogWorkspace description="Đây là cấp giao dịch: mỗi CopyBarcode chỉ định duy nhất một cuốn vật lý, độc lập với ISBN và các bản cùng ấn bản." screenCode="SCR-INV-03 / KHO SÁCH" title={copy.copyBarcode}>
      <Card padding="none"><div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black tracking-tight text-slate-900">{copy.copyBarcode}</h2><CopyStatusBadge status={copy.status} /></div><p className="mt-2 text-sm text-slate-600">{titleQuery.data?.name || 'Đang tải đầu sách…'}</p>{editionQuery.data && <Link className="mt-2 inline-block text-xs font-bold text-indigo-600 hover:text-indigo-700" to={catalogPaths.editionDetail(editionQuery.data.id)}>Quay lại ấn bản {editionQuery.data.isbn || 'không ISBN'} →</Link>}<p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{copy.conditionNote || 'Không có ghi chú về tình trạng cuốn sách.'}</p></div><dl className="grid gap-3 text-sm"><Detail label="Hạng tình trạng" value={copy.conditionGrade} /><Detail label="Kênh hoạt động" value={availabilityLabel(copy.availability)} /><Detail label="Giá bán" value={formatVnd(copy.sellingPrice)} /><Detail label="Giá thuê" value={formatVnd(copy.rentalRate)} /><Detail label="Vị trí kệ" value={copy.shelfCode || 'Chưa xếp kệ'} /></dl></div></Card>
    </CatalogWorkspace>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-xs text-slate-500">{label}</dt><dd className="text-right font-bold text-slate-800">{value}</dd></div>
}
