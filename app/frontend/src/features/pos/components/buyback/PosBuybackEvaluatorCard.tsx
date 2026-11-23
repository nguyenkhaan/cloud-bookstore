import type { FormEvent } from 'react'
import { BookOpen } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { formatVnd } from '../../pos-transaction.utils'
import { GRADE_META, type BuybackGrade } from './pos-buyback.utils'

type PosBuybackEvaluatorCardProps = {
  agreedBuyPrice: number
  currentAuthorPublisher: string
  currentCoverPrice: number
  currentTitle: string
  editionOptions: SelectOption<string>[]
  expectedSalePrice: number
  isbnQuery: string
  isCurrentItemOverLimit: boolean
  isLookingUp: boolean
  isManualEntry: boolean
  onAddEvaluatedBook: () => void
  onChangeAgreedBuyPrice: (price: number) => void
  onChangeAuthorPublisher: (value: string) => void
  onChangeCoverPrice: (price: number) => void
  onChangeExpectedSalePrice: (price: number) => void
  onChangeIsbnQuery: (value: string) => void
  onChangeTitle: (value: string) => void
  onIsbnLookup: (event: FormEvent<HTMLFormElement>) => void
  onOpenQuickPicker: () => void
  onSelectEditionOption: (editionId: string) => void
  onSelectGrade: (grade: BuybackGrade) => void
  onToggleManualEntry: () => void
  selectedEditionId: string
  selectedGrade: BuybackGrade
  suggestedRangeText: string
}

export function PosBuybackEvaluatorCard({
  agreedBuyPrice,
  currentAuthorPublisher,
  currentCoverPrice,
  currentTitle,
  editionOptions,
  expectedSalePrice,
  isbnQuery,
  isCurrentItemOverLimit,
  isLookingUp,
  isManualEntry,
  onAddEvaluatedBook,
  onChangeAgreedBuyPrice,
  onChangeAuthorPublisher,
  onChangeCoverPrice,
  onChangeExpectedSalePrice,
  onChangeIsbnQuery,
  onChangeTitle,
  onIsbnLookup,
  onOpenQuickPicker,
  onSelectEditionOption,
  onSelectGrade,
  onToggleManualEntry,
  selectedEditionId,
  selectedGrade,
  suggestedRangeText,
}: PosBuybackEvaluatorCardProps) {
  return (
    <Card bodyClassName="space-y-5" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button onClick={onOpenQuickPicker} type="button" variant="outline">
          + Thu mua theo Bộ truyện (Series Quick-Picker)
        </Button>

        {editionOptions.length > 0 && (
          <div className="w-72">
            <SelectBox
              hideLabel
              label="Chọn nhanh ấn bản từ danh mục"
              onChange={onSelectEditionOption}
              options={editionOptions}
              placeholder="Chọn ấn bản có sẵn..."
              searchPlaceholder="Tìm đầu sách / ISBN..."
              value={selectedEditionId}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Tra cứu & Định giá sách</h3>
        <span className="text-xs text-slate-400">---</span>
      </div>

      <form onSubmit={onIsbnLookup}>
        <div className="relative">
          <input
            aria-label="Tra cứu ISBN sách thu mua"
            className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/25 py-3 pl-4 pr-20 font-mono text-sm font-bold text-indigo-700 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden"
            onChange={(e) => onChangeIsbnQuery(e.target.value)}
            placeholder="Nhập hoặc quét ISBN / Tên sách rồi nhấn Enter..."
            type="text"
            value={isbnQuery}
          />
          <button
            className="absolute right-3 top-2.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            disabled={isLookingUp}
            type="submit"
          >
            {isLookingUp ? '...' : 'Enter'}
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Máy quét đang lắng nghe - Quét ISBN hoặc gõ tên sách để tra cứu từ DB
        </p>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-900 text-white shadow-2xs">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{currentTitle}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {currentAuthorPublisher} - Giá bìa {formatVnd(currentCoverPrice)}
            </p>
          </div>
        </div>

        <Button onClick={onToggleManualEntry} type="button" variant="outline">
          {isManualEntry ? 'Đóng nhập tay' : 'Nhập tay nếu không có ISBN'}
        </Button>
      </div>

      {isManualEntry && (
        <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 sm:grid-cols-3">
          <TextField
            label="Tên sách / Tập *"
            onChange={(e) => onChangeTitle(e.target.value)}
            value={currentTitle}
          />
          <TextField
            label="Tác giả & Nhà xuất bản"
            onChange={(e) => onChangeAuthorPublisher(e.target.value)}
            value={currentAuthorPublisher}
          />
          <TextField
            label="Giá bìa tham chiếu (VNĐ)"
            onChange={(e) => onChangeCoverPrice(Math.max(0, Number(e.target.value) || 0))}
            type="number"
            value={String(currentCoverPrice)}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['A', 'B', 'C', 'D'] as BuybackGrade[]).map((grade) => {
          const isSelected = selectedGrade === grade
          return (
            <button
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                isSelected
                  ? 'bg-white text-indigo-700 ring-2 ring-indigo-600 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              key={grade}
              onClick={() => onSelectGrade(grade)}
              type="button"
            >
              {GRADE_META[grade].badgeLabel}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Khoảng giá mua đề xuất" readOnly value={suggestedRangeText} />
        <TextField
          label="Giá thỏa thuận thực tế"
          onChange={(e) => onChangeAgreedBuyPrice(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
          value={formatVnd(agreedBuyPrice)}
        />
        <TextField
          label="Giá bán niêm yết dự kiến"
          onChange={(e) => onChangeExpectedSalePrice(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
          value={formatVnd(expectedSalePrice)}
        />
      </div>

      {isCurrentItemOverLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-600 text-[10px] font-bold text-amber-700">
            !
          </span>
          <span>
            Cần Admin duyệt giá (Nhập PIN tại chỗ hoặc gửi sang Trung tâm Phê duyệt)
          </span>
        </div>
      )}

      <div>
        <Button onClick={onAddEvaluatedBook} type="button" variant="outline">
          Thêm vào danh sách thu mua
        </Button>
      </div>
    </Card>
  )
}
