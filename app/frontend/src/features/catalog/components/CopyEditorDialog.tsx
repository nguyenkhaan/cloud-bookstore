import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import type { CopyAvailability, CreateCopyRequest, ConditionGrade } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'

const AVAILABILITY_OPTIONS: SelectOption<CopyAvailability>[] = [
  { value: 'BOTH', label: 'Bán và cho thuê' },
  { value: 'SALE_ONLY', label: 'Chỉ bán' },
  { value: 'RENTAL_ONLY', label: 'Chỉ cho thuê' },
]

const CONDITION_OPTIONS: SelectOption<ConditionGrade>[] = [
  { value: 'A', label: 'A — Rất tốt' },
  { value: 'B', label: 'B — Tốt' },
  { value: 'C', label: 'C — Có hao mòn' },
  { value: 'D', label: 'D — Kém' },
]

type CopyEditorDialogProps = {
  editionId: string
  onClose: () => void
  onSave: (request: CreateCopyRequest) => Promise<void>
}

export function CopyEditorDialog({ editionId, onClose, onSave }: CopyEditorDialogProps) {
  const [copyBarcode, setCopyBarcode] = useState('')
  const [availability, setAvailability] = useState<CopyAvailability>('BOTH')
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>('A')
  const [conditionNote, setConditionNote] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [rentalRate, setRentalRate] = useState('')
  const [shelfCode, setShelfCode] = useState('')
  // Display-only until the stock-receipt flow (phase 05) provides receipt lines; not sent to the API.
  const [receiptLineId, setReceiptLineId] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!copyBarcode.trim()) {
      setError('CopyBarcode là bắt buộc để định danh từng cuốn vật lý.')
      return
    }
    if (availability !== 'RENTAL_ONLY' && !sellingPrice) {
      setError('Bản có kênh bán cần có giá bán.')
      return
    }
    if (availability !== 'SALE_ONLY' && !rentalRate) {
      setError('Bản có kênh cho thuê cần có giá thuê.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await onSave({
        availability,
        conditionGrade,
        conditionNote: conditionNote.trim() || null,
        copyBarcode: copyBarcode.trim(),
        editionId,
        rentalRate: rentalRate ? Number(rentalRate) : null,
        sellingPrice: sellingPrice ? Number(sellingPrice) : null,
        shelfCode: shelfCode.trim() || null,
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể tạo bản vật lý.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CatalogDialog onClose={onClose} title="Thêm bản sách vật lý">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Bản mới luôn ở trạng thái “Chờ nhập kho”. Chỉ chuyển sang “Sẵn sàng” sau khi nghiệp vụ nhập kho xác nhận.</p>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="CopyBarcode *" onChange={(event) => setCopyBarcode(event.target.value)} placeholder="VD: CB-HP1-0004" required value={copyBarcode} />
          <TextField label="Vị trí kệ" onChange={(event) => setShelfCode(event.target.value)} placeholder="VD: A-03-02" value={shelfCode} />
          <SelectBox
            className="sm:col-span-2"
            emptyHint="Sẽ có khi hoàn tất luồng nhập kho (phase 05)."
            emptyMessage="Chưa có dòng phiếu nhập nào."
            label="Dòng phiếu nhập"
            onChange={setReceiptLineId}
            options={[]}
            placeholder="Chưa có dòng phiếu nhập"
            value={receiptLineId}
          />
          <SelectBox label="Kênh sử dụng" onChange={setAvailability} options={AVAILABILITY_OPTIONS} value={availability} />
          <SelectBox label="Tình trạng" onChange={setConditionGrade} options={CONDITION_OPTIONS} value={conditionGrade} />
          {availability !== 'RENTAL_ONLY' && <TextField label="Giá bán (đ) *" min="0" onChange={(event) => setSellingPrice(event.target.value)} required type="number" value={sellingPrice} />}
          {availability !== 'SALE_ONLY' && <TextField label="Giá thuê (đ) *" min="0" onChange={(event) => setRentalRate(event.target.value)} required type="number" value={rentalRate} />}
        </div>
        <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
          <span className="block text-xs font-semibold text-slate-500">Ghi chú tình trạng</span>
          <textarea className="mt-1 block min-h-20 w-full resize-y bg-transparent text-sm text-indigo-950 outline-none" onChange={(event) => setConditionNote(event.target.value)} value={conditionNote} />
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button onClick={onClose} type="button" variant="ghost">Hủy</Button>
          <Button loading={isSaving} type="submit">Tạo bản vật lý</Button>
        </div>
      </form>
    </CatalogDialog>
  )
}
