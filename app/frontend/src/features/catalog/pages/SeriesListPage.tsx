import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, SearchIcon, TextField } from '@/components/common'
import { catalogPaths } from '../catalog.route'
import { useCreateSeriesMutation, useSeriesQuery } from '../catalog.hook'
import { ActiveBadge } from '../components/CatalogStatusBadge'
import { CatalogDialog } from '../components/CatalogDialog'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { SeriesCoverStack } from '../components/SeriesCoverStack'

export default function SeriesListPage() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const seriesQuery = useSeriesQuery(search)
  const createSeries = useCreateSeriesMutation()

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('Tên bộ sách là bắt buộc.')
      return
    }
    setFormError('')
    try {
      await createSeries.mutateAsync({ name: name.trim(), description: description.trim() || null })
      setName('')
      setDescription('')
      setIsDialogOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể tạo bộ sách.')
    }
  }

  const series = seriesQuery.data ?? []
  const completedSeries = series.filter((item) => item.expectedVolumeCount && item.titleCount === item.expectedVolumeCount).length

  return (
    <CatalogWorkspace
      action={<Button onClick={() => setIsDialogOpen(true)}>+ Tạo bộ sách mới</Button>}
      description="Theo dõi mức độ hoàn thiện của từng bộ truyện, nhận diện nhanh qua ảnh bìa và đi tiếp đến các đầu sách thuộc bộ."
      screenCode="SCR-INV-10 / KHO SÁCH"
      title="Quản lý Bộ sách & tiến độ đủ bộ"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Tổng số bộ sách" tone="indigo" value={String(series.length)} />
        <Metric label="Đủ bộ theo khai báo" tone="emerald" value={String(completedSeries)} />
        <Metric label="Cần bổ sung tập" tone="amber" value={String(series.filter((item) => item.expectedVolumeCount && item.titleCount !== item.expectedVolumeCount).length)} />
      </section>

      <Card className="overflow-hidden" padding="none">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh sách bộ sách</h2>
            <p className="mt-0.5 text-xs text-slate-500">Chọn một bộ để xem các đầu sách/tập thuộc bộ đó.</p>
          </div>
          <div className="min-w-0 sm:w-80">
            <TextField label="Tìm bộ sách" onChange={(event) => setSearch(event.target.value)} placeholder="Tên bộ truyện…" value={search} />
          </div>
        </div>
        {seriesQuery.isLoading ? <LoadingRows /> : seriesQuery.error ? <ErrorState message="Không thể tải danh sách bộ sách." /> : (
          <div className="grid gap-4 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
            {series.map((item) => {
              const expected = item.expectedVolumeCount ?? 0
              const present = item.titleCount ?? 0
              const progress = expected > 0 ? Math.min(100, Math.round((present / expected) * 100)) : 0
              return (
                <Link
                  aria-describedby={`series-${item.id}-status series-${item.id}-details`}
                  aria-labelledby={`series-${item.id}-name series-${item.id}-cta`}
                  className="group flex min-w-0 gap-4 rounded-xl border border-transparent bg-white p-4 pt-5 transition-colors hover:border-indigo-200 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-indigo-600/30"
                  key={item.id}
                  to={catalogPaths.titlesForSeries(item.id)}
                >
                  <SeriesCoverStack imageUrl={item.imageUrl} name={item.name} titleCount={item.titleCount} key={item.imageUrl ?? 'no-cover'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-sm font-bold text-slate-900" id={`series-${item.id}-name`}>{item.name}</h3>
                      <span id={`series-${item.id}-status`}><ActiveBadge active={item.isActive} /></span>
                    </div>
                    <div id={`series-${item.id}-details`}>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{item.description || 'Chưa có mô tả cho bộ sách này.'}</p>
                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{present} / {expected || '—'} tập</span>
                        <span className="text-right font-bold text-indigo-600">{expected ? `${progress}%` : 'Chưa đặt mục tiêu'}</span>
                      </div>
                      <div aria-label={`Tiến độ ${item.name}`} className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}>
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    </div>
                    <span id={`series-${item.id}-cta`} className="mt-4 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                      Xem {present} đầu sách <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              )
            })}
            {!series.length && <EmptyState />}
          </div>
        )}
      </Card>

      {isDialogOpen && (
        <CatalogDialog onClose={() => setIsDialogOpen(false)} title="Tạo bộ sách mới">
          <form className="space-y-4" onSubmit={handleCreate}>
            {formError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{formError}</p>}
            <TextField label="Tên bộ sách *" onChange={(event) => setName(event.target.value)} required value={name} />
            <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
              <span className="block text-xs font-semibold text-slate-500">Mô tả</span>
              <textarea className="mt-1 block min-h-24 w-full resize-y bg-transparent text-sm text-indigo-950 outline-none" onChange={(event) => setDescription(event.target.value)} value={description} />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="ghost">Hủy</Button>
              <Button loading={createSeries.isPending} type="submit">Tạo bộ sách</Button>
            </div>
          </form>
        </CatalogDialog>
      )}
    </CatalogWorkspace>
  )
}

function Metric({ label, tone, value }: { label: string; tone: 'amber' | 'emerald' | 'indigo'; value: string }) {
  const tones = { amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', indigo: 'bg-indigo-50 text-indigo-700' }
  return <Card className="p-5" padding="none"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 w-fit rounded-lg px-2.5 py-1 text-2xl font-black ${tones[tone]}`}>{value}</p></Card>
}

export function LoadingRows() {
  return <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="h-64 animate-pulse bg-white" key={index} />)}</div>
}

export function ErrorState({ message }: { message: string }) {
  return <div className="p-8 text-center text-sm text-rose-700" role="alert">{message}</div>
}

export function EmptyState() {
  return <div className="col-span-full grid min-h-52 place-items-center bg-white p-8 text-center"><div><SearchIcon className="mx-auto text-slate-400" size={26} /><p className="mt-3 text-sm font-bold text-slate-800">Chưa tìm thấy dữ liệu</p><p className="mt-1 text-xs text-slate-500">Đổi bộ lọc hoặc tạo bản ghi đầu tiên.</p></div></div>
}
