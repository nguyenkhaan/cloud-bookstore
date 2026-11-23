import { Card } from '@/components/common'
import type { StockOutDetail } from '../../catalog.type'
import { formatDateTimeVi, formatVnd, type StockOutHistoryLog } from './stock-out.utils'

type StockOutHistoryTableCardProps = {
  activeSlipId: string | null
  historyLogs: StockOutHistoryLog[]
  onSelectSlip: (slip: StockOutDetail) => void
  recentSlips: StockOutDetail[]
}

export function StockOutHistoryTableCard({
  activeSlipId,
  historyLogs,
  onSelectSlip,
  recentSlips,
}: StockOutHistoryTableCardProps) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden" padding="none">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Lịch sử xử lý phiếu</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3 text-left" scope="col">Thời gian</th>
                <th className="px-4 py-3 text-left" scope="col">Người thực hiện</th>
                <th className="px-4 py-3 text-left" scope="col">Thao tác</th>
                <th className="px-5 py-3 text-left" scope="col">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLogs.map((log) => (
                <tr className="hover:bg-slate-50/70" key={log.id}>
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{log.actor}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{log.action}</td>
                  <td className="px-5 py-3.5 text-slate-500">{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {recentSlips.length > 0 && (
        <Card className="overflow-hidden" padding="none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Phiếu xuất kho gần đây ({recentSlips.length})</h2>
            <span className="text-[11px] text-slate-500">Nhấn vào dòng bất kỳ để xem chi tiết</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-5 py-3 text-left" scope="col">Mã phiếu / Loại xuất</th>
                  <th className="px-4 py-3 text-left" scope="col">Ngày lập</th>
                  <th className="px-4 py-3 text-left" scope="col">Số lượng</th>
                  <th className="px-4 py-3 text-left" scope="col">Tổng giá vốn</th>
                  <th className="px-5 py-3 text-left" scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSlips.map((slip) => (
                  <tr
                    className={`cursor-pointer transition hover:bg-slate-50/70 ${
                      activeSlipId === slip.id ? 'bg-indigo-50/60' : ''
                    }`}
                    key={slip.id}
                    onClick={() => onSelectSlip(slip)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900 block">{slip.code}</span>
                      <span className="text-slate-600">{slip.stockOutTypeLabel}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDateTimeVi(slip.createdAt)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{slip.copyCount} bản sách</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{formatVnd(slip.totalCost)}</td>
                    <td className="px-5 py-3.5">
                      {slip.status === 'COMPLETED' ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          Đã xuất kho
                        </span>
                      ) : slip.status === 'APPROVED' ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                          Đã duyệt - Chờ xuất
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
