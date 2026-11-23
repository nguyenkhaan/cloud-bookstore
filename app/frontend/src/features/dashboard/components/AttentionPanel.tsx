import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge, Card } from '@/components/common'
import { formatPercent, toNumber } from '../dashboard.presentation'
import type { OverviewAttention } from '../dashboard.type'

export interface AttentionPanelProps {
  attention: OverviewAttention
  vietQrSuccessRatePct: number | string
  vietQrTotalCount: number | string
  isAdmin: boolean
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({
  attention,
  vietQrSuccessRatePct,
  vietQrTotalCount,
  isAdmin,
}) => {
  const rateNum = toNumber(vietQrSuccessRatePct)
  const targetNum = toNumber(attention.vietQrTargetPct)
  const pendingQrNum = toNumber(attention.vietQrPendingOrFailedCount)
  const hasVietQrTransactions = toNumber(vietQrTotalCount) > 0
  const isHealthyVietQr = rateNum >= targetNum && pendingQrNum === 0
  const delta = rateNum - targetNum

  return (
    <Card title="Hoạt động cần chú ý">
      <div className="space-y-4 text-xs">
        <div>
          <Badge variant="danger" size="sm">
            {attention.overdueSlipCount} phiếu quá hạn
          </Badge>
          <p className="mt-1.5 leading-relaxed text-slate-600">
            {attention.overdueOver7DaysCustomerCount} khách đã quá hạn trên 7 ngày. Ưu tiên liên hệ để
            thu hồi sách và quyết toán.
          </p>
        </div>

        <div>
          <Badge variant="warning" size="sm">
            {attention.lowStockEditionCount} đầu sách chạm min
          </Badge>
          <p className="mt-1.5 leading-relaxed text-slate-600">
            {attention.outOfStockEditionCount} ấn bản không còn bản khả dụng.{' '}
            {attention.pendingReceiptCopyCount} bản đang chờ hoàn tất nhập từ NCC.
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            !hasVietQrTransactions
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : isHealthyVietQr
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
              : 'border-amber-200 bg-amber-50/70 text-amber-800'
          }`}
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {hasVietQrTransactions ? (
              <p className="leading-relaxed">
                VietQR đạt {formatPercent(rateNum)}{' '}
                {delta >= 0
                  ? `(vượt mục tiêu ${delta.toFixed(1)} điểm %)`
                  : `(thấp hơn mục tiêu ${Math.abs(delta).toFixed(1)} điểm %)`}
                . {pendingQrNum > 0
                  ? `${pendingQrNum} giao dịch cần đối soát thủ công, không xác nhận thu hai lần.`
                  : 'Tất cả giao dịch trực tuyến đã đối soát ổn định.'}
              </p>
            ) : (
              <p className="leading-relaxed">Chưa có giao dịch VietQR trong ngày.</p>
            )}
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/reports/revenue-expense"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Mở báo cáo chi tiết
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </Card>
  )
}
