import { useEffect, useRef } from 'react'
import { Badge, Button, TextField } from '@/components/common'

type CloseShiftDialogProps = {
  theoreticalCash: number
  countedCash: number
  explanation: string
  onExplanationChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export function CloseShiftDialog({
  theoreticalCash,
  countedCash,
  explanation,
  onExplanationChange,
  onClose,
  onConfirm,
}: CloseShiftDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const variance = countedCash - theoreticalCash
  const requiresExplanation = variance !== 0

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div aria-labelledby="close-shift-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs" role="dialog">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="close-shift-title">Đóng ca & bàn giao két</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Kiểm tra số liệu trước khi gửi biên bản cho Quản lý.</p>
          </div>
          <button aria-label="Đóng hộp thoại đóng ca" className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Tiền hệ thống</p><p className="mt-1 font-bold text-slate-900">{formatVnd(theoreticalCash)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Tiền thực đếm</p><p className="mt-1 font-bold text-slate-900">{formatVnd(countedCash)}</p></div>
          <div className={`rounded-xl p-3 ${requiresExplanation ? 'bg-rose-50' : 'bg-emerald-50'}`}><p className="text-[11px] text-slate-500">Chênh lệch</p><p className={`mt-1 font-bold ${requiresExplanation ? 'text-rose-600' : 'text-emerald-600'}`}>{formatVnd(variance)}</p></div>
        </div>

        <div className="mt-5">
          {requiresExplanation && <Badge dot size="sm" variant="danger">Cần Admin xử lý chênh lệch</Badge>}
          <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="variance-explanation">Giải trình chênh lệch {requiresExplanation ? '*' : '(không bắt buộc)'}</label>
          <TextField
            aria-label="Giải trình chênh lệch"
            className="mt-2"
            id="variance-explanation"
            onChange={(event) => onExplanationChange(event.target.value)}
            placeholder="Nhập lý do và bằng chứng đối soát"
            value={explanation}
          />
          {requiresExplanation && <p className="mt-2 text-[11px] text-rose-600">Bắt buộc nhập khi chênh lệch khác 0đ.</p>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Hủy</Button>
          <Button disabled={requiresExplanation && !explanation.trim()} onClick={onConfirm}>Kế toán & Gửi duyệt đóng ca</Button>
        </div>
      </div>
    </div>
  )
}
