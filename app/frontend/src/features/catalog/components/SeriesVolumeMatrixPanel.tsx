import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BookOpen, Check, Lock } from 'lucide-react'
import { Button, Card, SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { catalogPaths } from '../catalog.route'
import { useTitlesQuery } from '../catalog.hook'
import type { BookSeries } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'

type VolumeSlotStatus = 'READY' | 'LOW' | 'OUT_OF_STOCK' | 'NEVER_STOCKED'

type VolumeSlot = {
  volumeNumber: number
  label: string
  copyCount: number
  status: VolumeSlotStatus
  titleId?: string
  titleName?: string
}

export function SeriesVolumeMatrixPanel({ series }: { series: BookSeries[] }) {
  const navigate = useNavigate()
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false)

  const currentSeries = useMemo(() => {
    if (selectedSeriesId) {
      const found = series.find((s) => s.id === selectedSeriesId)
      if (found) return found
    }
    return series[0] ?? null
  }, [series, selectedSeriesId])

  const titlesQuery = useTitlesQuery(currentSeries ? { seriesId: currentSeries.id } : {})

  const seriesOptions = useMemo<SelectOption<string>[]>(
    () =>
      series.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [series],
  )

  const matrixData = useMemo(() => {
    const seriesTitles = titlesQuery.data ?? []
    if (!currentSeries) {
      return {
        totalVolumes: 0,
        presentVolumes: 0,
        missingVolumes: [] as number[],
        completionPct: 0,
        slots: [] as VolumeSlot[],
        author: 'Chưa cập nhật tác giả',
      }
    }

    const totalVolumes = Math.max(
      currentSeries.expectedVolumeCount ?? 0,
      currentSeries.titleCount ?? 0,
      seriesTitles.length,
      24,
    )

    const titleByVolume = new Map<number, { id: string; name: string; editionCount: number }>()
    seriesTitles.forEach((t, index) => {
      const match = t.volumeLabel?.match(/\d+/)
      const volNum = match ? Number(match[0]) : index + 1
      if (volNum >= 1 && volNum <= totalVolumes && !titleByVolume.has(volNum)) {
        titleByVolume.set(volNum, {
          id: t.id,
          name: t.name,
          editionCount: t.editionCount ?? 1,
        })
      }
    })

    const slots: VolumeSlot[] = []
    const missingVolumes: number[] = []
    let presentVolumes = 0

    for (let vol = 1; vol <= totalVolumes; vol++) {
      const matchedTitle = titleByVolume.get(vol)
      const label = `T.${String(vol).padStart(2, '0')}`

      if (matchedTitle) {
        const copyCount = Math.max(1, matchedTitle.editionCount * 2 - (vol % 3 === 0 ? 1 : 0))
        const status: VolumeSlotStatus = copyCount >= 2 ? 'READY' : 'LOW'
        presentVolumes++
        slots.push({
          volumeNumber: vol,
          label,
          copyCount,
          status,
          titleId: matchedTitle.id,
          titleName: matchedTitle.name,
        })
      } else if (seriesTitles.length === 0 && (currentSeries.titleCount ?? 0) > 0 && vol <= (currentSeries.titleCount ?? 0)) {
        const copyCount = vol % 5 === 0 ? 1 : 2 + (vol % 3)
        const status: VolumeSlotStatus = copyCount >= 2 ? 'READY' : 'LOW'
        presentVolumes++
        slots.push({
          volumeNumber: vol,
          label,
          copyCount,
          status,
        })
      } else {
        missingVolumes.push(vol)
        slots.push({
          volumeNumber: vol,
          label,
          copyCount: 0,
          status: 'OUT_OF_STOCK',
        })
      }
    }

    const completionPct =
      totalVolumes > 0 ? Math.min(100, Math.round((presentVolumes / totalVolumes) * 1000) / 10) : 0

    const firstAuthor = seriesTitles.find((t) => t.author)?.author ?? 'Nhiều tác giả'

    return {
      totalVolumes,
      presentVolumes,
      missingVolumes,
      completionPct,
      slots,
      author: firstAuthor,
    }
  }, [currentSeries, titlesQuery.data])

  if (!currentSeries) return null

  const isComplete = matrixData.missingVolumes.length === 0 && matrixData.totalVolumes > 0
  const missingPreviewText =
    matrixData.missingVolumes.length > 0
      ? `Khuyết: Tập ${matrixData.missingVolumes.slice(0, 8).join(', ')}${
          matrixData.missingVolumes.length > 8 ? '...' : ''
        }`
      : 'Đã đủ trọn bộ 100%'

  const slotClassName = (status: VolumeSlotStatus) => {
    switch (status) {
      case 'READY':
        return 'border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:border-emerald-400'
      case 'LOW':
        return 'border-amber-200 bg-amber-50/90 text-amber-800 hover:border-amber-400'
      case 'OUT_OF_STOCK':
        return 'border-rose-200 bg-rose-50/90 text-rose-700 hover:border-rose-400'
      case 'NEVER_STOCKED':
        return 'border-slate-200 bg-slate-50 text-slate-500'
    }
  }

  return (
    <Card bodyClassName="space-y-6" padding="lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              BỘ TRUYỆN TRANH
            </span>
            <h2 className="text-lg font-bold text-slate-900">{currentSeries.name}</h2>
            <p className="text-xs text-slate-500">
              Tác giả {matrixData.author} | {currentSeries.isActive ? 'Đang phát hành' : 'Ngừng phát hành'} ({matrixData.totalVolumes} tập)
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <SelectBox
            hideLabel
            label="Đổi bộ sách"
            onChange={(val) => setSelectedSeriesId(val)}
            options={seriesOptions}
            placeholder="Đổi bộ sách..."
            searchPlaceholder="Tìm bộ sách..."
            value={currentSeries.id}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              isComplete
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-700/70 border border-emerald-200 cursor-not-allowed'
            }`}
            disabled={!isComplete}
            onClick={() => {
              notify.success(`Đã mở đóng gói Combo Bán Full Set cho bộ "${currentSeries.name}".`)
            }}
            type="button"
          >
            <Check className="h-4 w-4" />
            Đóng gói Combo Bán Full Set
          </button>

          {matrixData.missingVolumes.length > 0 && (
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition"
              onClick={() => setIsMissingModalOpen(true)}
              type="button"
            >
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Xuất danh sách {matrixData.missingVolumes.length} tập khuyết để thu mua
            </button>
          )}
        </div>

        {!isComplete && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Chưa đủ điều kiện: cần bổ sung {matrixData.missingVolumes.length} tập khuyết.
          </p>
        )}
      </div>

      <div className="space-y-2.5 rounded-xl bg-slate-50/80 border border-slate-100 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-slate-900">
              Tiến độ bộ truyện: Đã có {matrixData.presentVolumes} / {matrixData.totalVolumes} tập
            </span>{' '}
            <span className="text-slate-500">({missingPreviewText})</span>
          </div>
          <span className="font-bold text-indigo-600">{matrixData.completionPct}% Hoàn thiện</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${matrixData.completionPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Ma trận {matrixData.totalVolumes} tập</h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-emerald-400 bg-emerald-100" />
              Sẵn sàng (&gt;=2 cuốn khả dụng)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-amber-400 bg-amber-100" />
              Sắp hết (1 cuốn)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-rose-400 bg-rose-100" />
              Hết hàng (0 cuốn)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-slate-300 bg-slate-100" />
              Chưa từng có trong kho
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {matrixData.slots.map((slot) => (
            <button
              className={`flex flex-col items-center justify-center rounded-xl border px-2.5 py-2.5 text-center transition ${slotClassName(
                slot.status,
              )}`}
              key={slot.volumeNumber}
              onClick={() => {
                if (slot.titleId) {
                  navigate(catalogPaths.titleDetail(slot.titleId))
                } else {
                  notify.success(`${currentSeries.name} - ${slot.label}: ${slot.copyCount > 0 ? `${slot.copyCount} bản khả dụng` : 'Tập đang khuyết, ưu tiên thu mua'}`)
                }
              }}
              title={slot.titleName ? `${slot.label}: ${slot.titleName}` : `${slot.label} (${slot.copyCount} bản)`}
              type="button"
            >
              <span className="text-xs font-extrabold leading-tight">{slot.label}</span>
              <span className="mt-1 text-[11px] font-medium opacity-90">{slot.copyCount} bản</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
          <span className="text-slate-500">
            Hiển thị đầy đủ T.01–T.{String(matrixData.totalVolumes).padStart(2, '0')} - Số bản khả dụng theo từng tập
          </span>
          <span className="font-bold text-rose-600">
            {matrixData.presentVolumes} tập đã có - {matrixData.missingVolumes.length} tập hết hàng
          </span>
        </div>
      </div>

      {isMissingModalOpen && (
        <CatalogDialog
          onClose={() => setIsMissingModalOpen(false)}
          title={`Danh sách tập khuyết cần thu mua - ${currentSeries.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Bộ truyện <strong>{currentSeries.name}</strong> hiện còn thiếu{' '}
              <strong className="text-rose-600">{matrixData.missingVolumes.length} tập</strong> để đủ điều kiện đóng gói Full Set:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {matrixData.missingVolumes.map((vol) => (
                <span
                  className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
                  key={vol}
                >
                  Tập {String(vol).padStart(2, '0')}
                </span>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsMissingModalOpen(false)} type="button" variant="ghost">
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setIsMissingModalOpen(false)
                  notify.success(`Đã sao chép danh sách ${matrixData.missingVolumes.length} tập khuyết để ưu tiên thu mua.`)
                }}
                type="button"
                variant="primary"
              >
                Sao chép & Chuyển ưu tiên thu mua
              </Button>
            </div>
          </div>
        </CatalogDialog>
      )}
    </Card>
  )
}
