import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import type { AvailableReceiptLine, BookCopy, ConditionGrade, CopyAvailability, CreateCopyRequest, UpdateCopyRequest } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'
import { CoverUploadField } from './CoverUploadField'

const availabilityOptions: SelectOption<CopyAvailability>[] = [
  { value: 'BOTH', label: 'Bán và cho thuê' },
  { value: 'SALE_ONLY', label: 'Chỉ bán' },
  { value: 'RENTAL_ONLY', label: 'Chỉ cho thuê' },
]
const conditionOptions: SelectOption<ConditionGrade>[] = [
  { value: 'A', label: 'A — Rất tốt' }, { value: 'B', label: 'B — Tốt' },
  { value: 'C', label: 'C — Có hao mòn' }, { value: 'D', label: 'D — Kém' },
]

type Props = {
  editionId: string
  editionImageUrl?: string | null
  receiptLines?: AvailableReceiptLine[]
  copy?: BookCopy
  onClose: () => void
  onSave: (request: CreateCopyRequest | UpdateCopyRequest) => Promise<void>
}

export function CopyEditorDialog({ editionId, editionImageUrl, receiptLines = [], copy, onClose, onSave }: Props) {
  const [receiptLineId, setReceiptLineId] = useState(receiptLines[0]?.id ?? '')
  const [availability, setAvailability] = useState<CopyAvailability>(copy?.availability ?? receiptLines[0]?.availability ?? 'BOTH')
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(copy?.conditionGrade ?? receiptLines[0]?.conditionGrade ?? 'A')
  const [conditionNote, setConditionNote] = useState(copy?.conditionNote ?? '')
  const [sellingPrice, setSellingPrice] = useState(copy?.sellingPrice?.toString() ?? '')
  const [rentalRate, setRentalRate] = useState(copy?.rentalRate?.toString() ?? '')
  const [shelfCode, setShelfCode] = useState(copy?.shelfCode ?? '')
  const [reason, setReason] = useState('')
  const [previewUrl, setPreviewUrl] = useState(copy?.imageUrl ?? '')
  const [imageUpload, setImageUpload] = useState<CloudinaryUploadResultRequest | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const locked = copy?.status === 'RENTED' || copy?.status === 'SOLD'
  const selectedReceiptLineId = receiptLineId || receiptLines[0]?.id || ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!copy && !selectedReceiptLineId) { setError('Chọn dòng phiếu nhập còn số lượng.'); return }
    if (copy && !reason.trim()) { setError('Nhập lý do thay đổi.'); return }
    if (!locked && !(Number(sellingPrice) > 0 && Number.isSafeInteger(Number(sellingPrice)))) { setError('Giá bán thực tế phải lớn hơn 0 để định giá và tính tiền cọc.'); return }
    if (!locked && availability !== 'SALE_ONLY' && !(Number(rentalRate) > 0)) { setError('Giá thuê phải lớn hơn 0.'); return }
    setError('')
    setIsSaving(true)
    try {
      const fields = {
        availability, conditionGrade, conditionNote: conditionNote.trim() || null,
        sellingPrice: sellingPrice ? Number(sellingPrice) : null,
        rentalRate: rentalRate ? Number(rentalRate) : null,
        shelfCode: shelfCode.trim() || null,
        imageUpload,
      }
      await onSave(copy ? { ...fields, reason: reason.trim() } : { ...fields, editionId, receiptLineId: selectedReceiptLineId })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu bản sách.')
    } finally { setIsSaving(false) }
  }

  return <CatalogDialog onClose={onClose} title={copy ? `Chỉnh sửa ${copy.copyBarcode}` : 'Thêm bản sách vật lý'}>
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <CoverUploadField disabled={isSaving || (!copy && !receiptLines.length)} fallbackUrl={editionImageUrl} imageUrl={previewUrl} onBusyChange={setIsUploading} onUpload={(upload, url) => { setImageUpload(upload); setPreviewUrl(url ?? '') }} ownerType="BOOK_COPY_IMAGE" title={copy?.copyBarcode ?? 'Bản sách mới'} />
      {!copy && <>
        {receiptLines.length ? <SelectBox label="Dòng phiếu nhập *" onChange={(value) => { setReceiptLineId(value); const line = receiptLines.find((item) => item.id === value); if (line) { setAvailability(line.availability); setConditionGrade(line.conditionGrade) } }} options={receiptLines.map((line) => ({ value: line.id, label: `${line.receiptCode} · còn ${line.remainingQuantity} bản` }))} value={selectedReceiptLineId} />
          : <p className="text-sm text-amber-800">Chưa có dòng phiếu nhập còn số lượng cho ấn bản này. Hãy tạo phiếu nhập trước.</p>}
        <p className="text-xs text-slate-500">CopyBarcode được cấp tự động khi lưu.</p>
      </>}
      {locked && <p className="text-xs text-amber-800">Bản đã phát sinh giao dịch: chỉ có thể sửa ghi chú và ảnh.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectBox label="Kênh sử dụng" onChange={setAvailability} options={availabilityOptions} value={availability} disabled={locked} />
        <SelectBox label="Tình trạng" onChange={setConditionGrade} options={conditionOptions} value={conditionGrade} disabled={locked} />
        <TextField disabled={locked} label="Giá bán (đ)" min="0" onChange={(event) => setSellingPrice(event.target.value)} type="number" value={sellingPrice} />
        <TextField disabled={locked} label="Giá thuê (đ)" min="0" onChange={(event) => setRentalRate(event.target.value)} type="number" value={rentalRate} />
        <TextField disabled={locked} label="Vị trí kệ" maxLength={30} onChange={(event) => setShelfCode(event.target.value)} value={shelfCode} />
        {copy && <TextField label="Lý do thay đổi *" maxLength={500} onChange={(event) => setReason(event.target.value)} required value={reason} />}
      </div>
      <label className="block text-xs font-semibold text-slate-600">Ghi chú tình trạng
        <textarea className="mt-1 block min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onChange={(event) => setConditionNote(event.target.value)} value={conditionNote} />
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose} type="button" variant="ghost">Hủy</Button>
        <Button disabled={isUploading || (!copy && !receiptLines.length)} loading={isSaving} type="submit">{copy ? 'Lưu thay đổi' : 'Tạo bản sách'}</Button>
      </div>
    </form>
  </CatalogDialog>
}
