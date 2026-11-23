import { useRef } from 'react'
import { Paperclip } from 'lucide-react'
import { Button, Card } from '@/components/common'
import type { StockOutApprovalStage } from './stock-out.utils'

type StockOutApprovalSidebarProps = {
  approvalStage: StockOutApprovalStage
  evidenceFileName: string
  evidencePreviewUrl: string | null
  evidenceTime: string
  isConfirming: boolean
  isSubmittingApproval: boolean
  onConfirmStockOut: () => void
  onFileSelected: (file: File | null) => void
  onNavigateApprovals: () => void
  onSendForApproval: () => void
}

export function StockOutApprovalSidebar({
  approvalStage,
  evidenceFileName,
  evidencePreviewUrl,
  evidenceTime,
  isConfirming,
  isSubmittingApproval,
  onConfirmStockOut,
  onFileSelected,
  onNavigateApprovals,
  onSendForApproval,
}: StockOutApprovalSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <Card bodyClassName="space-y-4" padding="lg">
        <h2 className="text-sm font-bold text-slate-900">Bằng chứng hiện trạng</h2>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-16/10 flex items-center justify-center">
          {evidencePreviewUrl ? (
            <img
              alt="Bằng chứng hiện trạng sách xuất kho"
              className="h-full w-full object-cover"
              src={evidencePreviewUrl}
            />
          ) : (
            <div className="p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                IMG
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700">Ảnh hiện trạng kệ B1</p>
              <p className="text-[11px] text-slate-500">Bằng chứng sách hư hỏng / ẩm mốc</p>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-700">{evidenceFileName}</p>
          <p>{evidenceTime}</p>
        </div>

        <input
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          ref={fileInputRef}
          type="file"
        />

        <Button
          icon={<Paperclip className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          Đính kèm ảnh / Biên bản
        </Button>
      </Card>

      <Card bodyClassName="space-y-4" padding="lg">
        <h2 className="text-sm font-bold text-slate-900">Trạng thái phê duyệt</h2>

        <div>
          {approvalStage === 'COMPLETED' ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              Đã hoàn tất xuất kho
            </span>
          ) : approvalStage === 'APPROVED' ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              Đã được Quản lý duyệt
            </span>
          ) : approvalStage === 'PENDING_APPROVAL' ? (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
              Đang chờ Quản lý duyệt
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              Bản nháp - Chưa xuất
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-600">
          Thủ kho lập phiếu → Quản lý xem bằng chứng → Phê duyệt → Kho ghi nhận xuất hủy.
        </p>

        <div className="space-y-2.5">
          <Button
            className="w-full justify-center"
            disabled={approvalStage !== 'DRAFT' || isSubmittingApproval}
            loading={isSubmittingApproval}
            onClick={onSendForApproval}
            type="button"
            variant="primary"
          >
            Gửi Quản lý phê duyệt
          </Button>

          <Button
            className="w-full justify-center"
            disabled={approvalStage === 'DRAFT' || approvalStage === 'COMPLETED' || isConfirming}
            loading={isConfirming}
            onClick={onConfirmStockOut}
            type="button"
            variant="outline"
          >
            Xác nhận xuất kho
          </Button>

          {approvalStage === 'PENDING_APPROVAL' && (
            <button
              className="block w-full text-center text-xs font-semibold text-indigo-600 hover:underline pt-1"
              onClick={onNavigateApprovals}
              type="button"
            >
              Xem tại Trung tâm Phê duyệt →
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Chỉ được xác nhận sau khi được duyệt. Mọi điều chỉnh lưu nhật ký kiểm toán.
        </p>
      </Card>
    </div>
  )
}
