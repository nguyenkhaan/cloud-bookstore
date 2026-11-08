import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card } from '@/components/common'
import { catalogPaths } from '../catalog.route'
import { useCreateEditionMutation, useEditionsQuery, useSeriesQuery, useTitleQuery, useUpdateTitleMutation } from '../catalog.hook'
import { formatVnd } from '../catalog.presentation'
import { ActiveBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { CoverTile } from '../components/CoverTile'
import { EditionEditorDialog } from '../components/EditionEditorDialog'
import { TitleEditorDialog } from '../components/TitleEditorDialog'
import { ErrorState, LoadingRows } from './SeriesListPage'

export default function TitleDetailPage() {
  const { titleId = '' } = useParams()
  const [isTitleEditorOpen, setIsTitleEditorOpen] = useState(false)
  const [isEditionEditorOpen, setIsEditionEditorOpen] = useState(false)
  const titleQuery = useTitleQuery(titleId)
  const editionsQuery = useEditionsQuery(titleId)
  const seriesQuery = useSeriesQuery()
  const updateTitle = useUpdateTitleMutation()
  const createEdition = useCreateEditionMutation()
  const title = titleQuery.data
  const editions = editionsQuery.data ?? []

  if (titleQuery.isLoading) {
    return (
      <CatalogWorkspace
        breadcrumbs={[
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Kho & đầu sách', href: catalogPaths.seriesList },
          { label: 'Đầu sách', href: catalogPaths.titleList },
          { label: 'Chi tiết đầu sách' },
        ]}
        title="Chi tiết đầu sách"
      >
        <LoadingRows />
      </CatalogWorkspace>
    )
  }
  if (!title || titleQuery.error) {
    return (
      <CatalogWorkspace
        breadcrumbs={[
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Kho & đầu sách', href: catalogPaths.seriesList },
          { label: 'Đầu sách', href: catalogPaths.titleList },
          { label: 'Chi tiết đầu sách' },
        ]}
        title="Chi tiết đầu sách"
      >
        <ErrorState message="Không tìm thấy đầu sách hoặc bạn không có quyền xem." />
      </CatalogWorkspace>
    )
  }

  return (
    <CatalogWorkspace
      action={<div className="flex flex-wrap gap-2"><Button onClick={() => setIsTitleEditorOpen(true)} variant="secondary">Chỉnh sửa đầu sách</Button><Button onClick={() => setIsEditionEditorOpen(true)}>+ Thêm ấn bản</Button></div>}
      breadcrumbs={[
        { label: 'Không gian làm việc', href: '/dashboard' },
        { label: 'Kho & đầu sách', href: catalogPaths.seriesList },
        { label: 'Đầu sách', href: catalogPaths.titleList },
        { label: title.name },
      ]}
      title={title.name}
    >
      <Card padding="none">
        <div className="grid gap-5 p-5 sm:grid-cols-[130px_1fr]">
          <CoverTile className="aspect-[3/4] w-30 rounded-xl border border-slate-200 shadow-md" imageUrl={title.coverImageUrl} title={title.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.16em] text-indigo-600">ĐẦU SÁCH / NỘI DUNG CHUNG</p><h2 className="mt-1 text-lg font-bold text-slate-900">{title.name}</h2><p className="mt-1 text-sm text-slate-500">{title.author || 'Chưa cập nhật tác giả'} {title.volumeLabel ? `• ${title.volumeLabel}` : ''}</p></div><ActiveBadge active={title.isActive} /></div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><Info label="Bộ sách" value={title.seriesName || 'Sách độc lập'} /><Info label="Số ấn bản" value={String(editions.length)} /><Info label="Ảnh bìa" value={title.coverImageUrl ? 'Đã tải lên Cloudinary' : 'Chưa có'} /></dl>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{title.description || 'Chưa có mô tả cho đầu sách này.'}</p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="editions-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold tracking-[0.14em] text-indigo-600">CẤP 3 / ẤN BẢN</p><h2 className="mt-1 text-base font-bold text-slate-900" id="editions-heading">Các ấn bản đã xác nhận</h2></div><span className="text-xs text-slate-500">ISBN có thể trùng giữa các lần in; không dùng thay CopyBarcode.</span></div>
        {editionsQuery.isLoading ? <LoadingRows /> : editionsQuery.error ? <ErrorState message="Không thể tải các ấn bản." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {editions.map((edition) => <Link className="group block" key={edition.id} to={catalogPaths.editionDetail(edition.id)}><Card className="h-full p-5 transition group-hover:border-indigo-200 group-hover:shadow-sm" padding="none"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-900">{edition.editionStatement || 'Ấn bản chưa đặt tên'}</p><p className="mt-1 text-xs text-slate-500">{edition.publisher || 'Chưa có NXB'} {edition.publishYear ? `• ${edition.publishYear}` : ''}</p></div><ActiveBadge active={edition.isActive} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><Info label="ISBN" value={edition.isbn || 'Không ISBN'} /><Info label="Giá bìa" value={formatVnd(edition.coverPrice)} /><Info label="Lần in" value={edition.printingStatement || '—'} /><Info label="Định dạng" value={edition.format || '—'} /></dl><p className="mt-4 text-xs font-bold text-indigo-600">Quản lý bản vật lý →</p></Card></Link>)}
            {!editions.length && <Card className="p-8 text-center text-sm text-slate-500" padding="none">Chưa có ấn bản. Hãy tạo ấn bản trước khi thêm bản sách vật lý.</Card>}
          </div>
        )}
      </section>
      {isTitleEditorOpen && <TitleEditorDialog onClose={() => setIsTitleEditorOpen(false)} onSave={async (request) => { await updateTitle.mutateAsync({ titleId, request }) }} series={seriesQuery.data ?? []} title={title} />}
      {isEditionEditorOpen && <EditionEditorDialog onClose={() => setIsEditionEditorOpen(false)} onSave={async (request) => { await createEdition.mutateAsync(request) }} titleId={titleId} />}
    </CatalogWorkspace>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 truncate font-semibold text-slate-700" title={value}>{value}</dd></div>
}
