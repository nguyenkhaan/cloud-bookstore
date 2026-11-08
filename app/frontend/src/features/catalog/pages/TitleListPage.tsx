import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import { catalogPaths } from '../catalog.route'
import { useCreateTitleMutation, useSeriesQuery, useTitlesQuery } from '../catalog.hook'
import { ActiveBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { TitleCoverStack } from '../components/TitleCoverStack'
import { TitleEditorDialog } from '../components/TitleEditorDialog'
import { TitleRowDeleteAction } from '../components/TitleRowDeleteAction'
import { EmptyState, ErrorState, LoadingRows } from './SeriesListPage'

export default function TitleListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const seriesId = searchParams.get('seriesId') ?? ''
  const seriesQuery = useSeriesQuery()
  const titlesQuery = useTitlesQuery({ search, seriesId: seriesId || undefined })
  const createTitle = useCreateTitleMutation()
  const series = seriesQuery.data ?? []
  const titles = titlesQuery.data ?? []

  const handleSave = async (request: Parameters<typeof createTitle.mutateAsync>[0]) => {
    await createTitle.mutateAsync(request)
  }

  return (
    <CatalogWorkspace
      action={<Button onClick={() => setIsEditorOpen(true)}>+ Thêm đầu sách</Button>}
      screenCode="SCR-INV-02 / KHO SÁCH"
      title="Danh mục đầu sách"
    >
      <Card className="overflow-hidden" padding="none">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_280px_220px] lg:items-end">
          <TextField label="Tìm đầu sách" onChange={(event) => setSearch(event.target.value)} placeholder="Tên sách hoặc tác giả…" value={search} />
          <SelectBox
            label="Lọc theo bộ sách"
            onChange={(value) => setSearchParams(value ? { seriesId: value } : {})}
            options={[{ value: '', label: 'Tất cả đầu sách' }, ...series.map((item) => ({ value: item.id, label: item.name }))]}
            searchPlaceholder="Tìm bộ sách…"
            value={seriesId}
          />
          <p className="px-3 py-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">{titles.length}</strong> đầu sách phù hợp</p>
        </div>
        {titlesQuery.isLoading ? <LoadingRows /> : titlesQuery.error ? <ErrorState message="Không thể tải danh mục đầu sách." /> : (
          <div className="divide-y divide-slate-100">
            {titles.map((title) => (
              <article className="group flex gap-4 p-4 transition hover:bg-slate-50/70" key={title.id}>
                <TitleCoverStack imageUrl={title.coverImageUrl} name={title.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link className="block truncate text-sm font-bold text-slate-900 hover:text-indigo-700" to={catalogPaths.titleDetail(title.id)}>{title.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">{title.author || 'Chưa cập nhật tác giả'} {title.volumeLabel ? `• ${title.volumeLabel}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <TitleRowDeleteAction title={title} />
                      <ActiveBadge active={title.isActive} />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{title.description || 'Chưa có mô tả.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">{title.seriesName || 'Sách độc lập'}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{title.editionCount ?? 0} ấn bản</span>
                    <Link className="text-indigo-600 hover:text-indigo-700" to={catalogPaths.titleDetail(title.id)}>Xem ấn bản →</Link>
                  </div>
                </div>
              </article>
            ))}
            {!titles.length && <EmptyState />}
          </div>
        )}
      </Card>
      {isEditorOpen && <TitleEditorDialog onClose={() => setIsEditorOpen(false)} onSave={handleSave} series={series} />}
    </CatalogWorkspace>
  )
}
