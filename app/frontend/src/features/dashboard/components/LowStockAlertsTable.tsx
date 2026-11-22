import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/common'
import type { LowStockAlertRow } from '../dashboard.type'

export interface LowStockAlertsTableProps {
  rows: LowStockAlertRow[]
  totalLowStockCount: number | string
}

export const LowStockAlertsTable: React.FC<LowStockAlertsTableProps> = ({
  rows,
  totalLowStockCount,
}) => {
  return (
    <Card title="Cảnh báo tồn kho thấp">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
          Không có ấn bản nào chạm ngưỡng tồn kho tối thiểu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                <th className="px-3.5 py-2.5 font-semibold first:rounded-l-xl">Đầu sách</th>
                <th className="px-3.5 py-2.5 font-semibold">Khả dụng / Min</th>
                <th className="px-3.5 py-2.5 font-semibold last:rounded-r-xl">Bổ sung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.editionId} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-3 font-semibold text-slate-900">
                    <Link
                      to={`/catalog/editions/${encodeURIComponent(row.editionId)}`}
                      className="hover:text-indigo-600"
                    >
                      {row.displayTitle}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">
                    {row.totalAvailable} / {row.totalMinRequired}
                  </td>
                  <td className="px-3.5 py-3 font-medium text-amber-700">
                    Nhập {row.suggestedReplenishQty} cuốn
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link
          to="/catalog/titles"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
        >
          Xem {totalLowStockCount} cảnh báo tồn
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}
