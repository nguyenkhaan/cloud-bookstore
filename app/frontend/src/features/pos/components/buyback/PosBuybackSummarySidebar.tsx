import { Button, Card, SelectBox } from '@/components/common'
import { formatVnd } from '../../pos-transaction.utils'
import {
  CASH_DRAWER_BEFORE,
  EXCEED_REASON_OPTIONS,
  type BuybackApprovalStage,
  type BuybackPayoutMethod,
} from './pos-buyback.utils'

type PosBuybackSummarySidebarProps = {
  approvalStatus: BuybackApprovalStage
  drawerAfter: number
  exceedReason: string
  isBusy: boolean
  managerPin: string
  onChangeExceedReason: (value: string) => void
  onChangeManagerPin: (value: string) => void
  onChangePayoutMethod: (method: BuybackPayoutMethod) => void
  onCompleteBuyback: () => void
  onRequestApproval: () => void
  payoutMethod: BuybackPayoutMethod
  requiresApproval: boolean
  totalCopies: number
  totalPayout: number
}

export function PosBuybackSummarySidebar({
  approvalStatus,
  drawerAfter,
  exceedReason,
  isBusy,
  managerPin,
  onChangeExceedReason,
  onChangeManagerPin,
  onChangePayoutMethod,
  onCompleteBuyback,
  onRequestApproval,
  payoutMethod,
  requiresApproval,
  totalCopies,
  totalPayout,
}: PosBuybackSummarySidebarProps) {
  const hasBooks = totalCopies > 0
  const hasPin = managerPin.trim().length >= 4
  const canRequestApproval =
    hasBooks && requiresApproval && approvalStatus !== 'APPROVED' && approvalStatus !== 'COMPLETED'
  const canCompletePayout =
    hasBooks &&
    approvalStatus !== 'COMPLETED' &&
    (!requiresApproval || approvalStatus === 'APPROVED' || hasPin)
  return (
    <div className="space-y-6">
      <Card bodyClassName="space-y-4" padding="lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Tổng kết thu mua</h3>
          <span className="text-xs text-slate-400">---</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Số bản sách vật lý</span>
            <strong className="font-bold text-slate-900">{totalCopies} cuốn</strong>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500">Tổng tiền chi thực tế</span>
            <span className="text-xl font-black text-indigo-700">{formatVnd(totalPayout)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            className={`rounded-lg py-2 text-xs font-bold transition ${
              payoutMethod === 'CASH'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => onChangePayoutMethod('CASH')}
            type="button"
          >
            Tiền mặt từ két
          </button>
          <button
            className={`rounded-lg py-2 text-xs font-bold transition ${
              payoutMethod === 'BANK_TRANSFER'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => onChangePayoutMethod('BANK_TRANSFER')}
            type="button"
          >
            Chuyển khoản ngoài
          </button>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Két trước chi</span>
            <strong className="font-bold text-slate-900">{formatVnd(CASH_DRAWER_BEFORE)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Két dự kiến sau chi</span>
            <strong className="font-bold text-slate-900">{formatVnd(drawerAfter)}</strong>
          </div>
        </div>

        <SelectBox
          label="Lý do đề xuất vượt hạn mức"
          onChange={onChangeExceedReason}
          options={EXCEED_REASON_OPTIONS}
          searchable={false}
          value={exceedReason}
        />

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <label className="block text-[11px] font-bold text-indigo-700" htmlFor="buyback-manager-pin">
            Admin duyệt tại chỗ - PIN 4 số
          </label>
          <input
            className="mt-1 w-full bg-transparent font-mono text-sm font-black tracking-widest text-indigo-950 outline-hidden"
            id="buyback-manager-pin"
            maxLength={6}
            onChange={(e) => onChangeManagerPin(e.target.value)}
            type="password"
            value={managerPin}
          />
        </div>

        <div className="space-y-2.5 pt-1">
          <Button
            className="w-full justify-center"
            disabled={isBusy || !canRequestApproval}
            onClick={onRequestApproval}
            type="button"
            variant="primary"
          >
            Gửi duyệt giá vượt hạn mức
          </Button>
          <Button
            className="w-full justify-center"
            disabled={isBusy || !canCompletePayout}
            onClick={onCompleteBuyback}
            type="button"
            variant={requiresApproval && !canCompletePayout ? 'secondary' : 'primary'}
          >
            Lập phiếu thu mua & Chi tiền
          </Button>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-600 text-[10px] font-bold text-indigo-700">
            i
          </span>
          <span className="leading-relaxed">
            {approvalStatus === 'COMPLETED'
              ? `Đã hoàn tất chi tiền và sinh ${totalCopies} mã CopyBarcode độc bản.`
              : approvalStatus === 'APPROVED'
                ? 'Đã được Admin duyệt giá. Nhấn "Lập phiếu thu mua & Chi tiền" để hoàn tất.'
                : !hasBooks
                  ? 'Quét ISBN hoặc chọn ấn bản để thêm sách vào danh sách thu mua.'
                  : requiresApproval
                    ? 'Phiếu vượt hạn mức (> 200.000đ/cuốn hoặc tổng > 1.000.000đ). Cần gửi Admin duyệt giá hoặc nhập PIN 4 số trước khi chi tiền.'
                    : 'Phiếu nằm trong hạn mức cho phép. Thu ngân có thể nhấn "Lập phiếu thu mua & Chi tiền" ngay.'}
          </span>
        </div>
      </Card>

      <Card bodyClassName="space-y-3" padding="lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Chứng từ & Chi phí</h3>
          <span className="text-xs text-slate-400">---</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Mỗi bản sách có giá vốn thực mua, giá bán dự kiến và Barcode riêng. Chứng từ lưu tên / SĐT người bán, thời gian và người lập.
        </p>
        <div>
          {approvalStatus === 'COMPLETED' ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              Đã chi tiền & Sinh Barcode
            </span>
          ) : approvalStatus === 'APPROVED' ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              Đã duyệt - Chờ chi tiền
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              Chờ Admin duyệt
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
