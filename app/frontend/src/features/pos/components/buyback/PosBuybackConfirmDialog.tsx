import { X } from 'lucide-react'
import { Button } from '@/components/common'
import { formatVnd } from '../../pos-transaction.utils'
import {
  CASH_DRAWER_BEFORE,
  type BuybackLineItem,
  type BuybackPayoutMethod,
} from './pos-buyback.utils'

type PosBuybackConfirmDialogProps = {
  buybackCode: string
  drawerAfter: number
  isSubmitting: boolean
  lines: BuybackLineItem[]
  onClose: () => void
  onConfirm: () => void
  payoutMethod: BuybackPayoutMethod
  sellerName: string
  sellerPhone: string
  totalCopies: number
  totalPayout: number
}

export function PosBuybackConfirmDialog({
  buybackCode,
  drawerAfter,
  isSubmitting,
  lines,
  onClose,
  onConfirm,
  payoutMethod,
  sellerName,
  sellerPhone,
  totalCopies,
  totalPayout,
}: PosBuybackConfirmDialogProps) {
  return (
    <div
      aria-labelledby="buyback-confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs"
      role="dialog"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900" id="buyback-confirm-dialog-title">
              Xác nhận Phiếu thu mua sách cũ & Chi tiền
            </h3>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              Mã chứng từ: {buybackCode} - Vui lòng kiểm tra kỹ trước khi chi tiền cho khách
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại xác nhận thu mua"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Người bán sách
              </span>
              <p className="text-sm font-bold text-slate-900">{sellerName}</p>
              <p className="font-mono text-xs text-slate-600">SĐT: {sellerPhone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Phương thức thanh toán
              </span>
              <p className="text-sm font-bold text-indigo-700">
                {payoutMethod === 'CASH' ? 'Tiền mặt từ két tại quầy' : 'Chuyển khoản ngân hàng'}
              </p>
              {payoutMethod === 'CASH' && (
                <p className="text-xs text-slate-600">
                  Két trước chi: <strong>{formatVnd(CASH_DRAWER_BEFORE)}</strong> → Sau chi:{' '}
                  <strong>{formatVnd(drawerAfter)}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Chi tiết sách thu mua ({totalCopies} cuốn)</h4>
              <span className="text-[11px] text-slate-500">Mỗi cuốn sẽ được sinh 1 mã CopyBarcode riêng</span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left" scope="col">#</th>
                    <th className="px-4 py-2.5 text-left" scope="col">Tên sách</th>
                    <th className="px-3 py-2.5 text-center" scope="col">Grade</th>
                    <th className="px-4 py-2.5 text-right" scope="col">Giá mua</th>
                    <th className="px-4 py-2.5 text-right" scope="col">Giá bán dự kiến</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lines.map((line, index) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2.5 font-mono text-slate-400">{index + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{line.titleName}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 border border-indigo-200">
                          {line.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        {formatVnd(line.buyPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {formatVnd(line.expectedSellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5">
            <div>
              <span className="font-bold text-indigo-950 block">Tổng số tiền chi cho khách hàng</span>
              <span className="text-[11px] text-indigo-700">
                Tổng cộng {totalCopies} bản sách vật lý sẽ được nhập kho
              </span>
            </div>
            <span className="text-xl font-black text-indigo-700">{formatVnd(totalPayout)}</span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-amber-900">
            Lưu ý (BR-BUY-004): Sau khi xác nhận chi tiền và sinh mã CopyBarcode, phiếu thu mua đã hoàn tất tài chính nên không thể hủy hoặc xóa trực tiếp.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="ghost">
            Quay lại kiểm tra
          </Button>
          <Button
            disabled={isSubmitting}
            loading={isSubmitting}
            onClick={onConfirm}
            type="button"
            variant="primary"
          >
            Xác nhận chi {formatVnd(totalPayout)} & Sinh Barcode
          </Button>
        </div>
      </div>
    </div>
  )
}
