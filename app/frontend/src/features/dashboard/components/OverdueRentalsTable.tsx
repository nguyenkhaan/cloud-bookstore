import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/common'
import { formatVnDateOnlyFromIso } from '../dashboard.presentation'
import type { OverdueCustomerRow } from '../dashboard.type'

export interface OverdueRentalsTableProps {
  rows: OverdueCustomerRow[]
}

export const OverdueRentalsTable: React.FC<OverdueRentalsTableProps> = ({ rows }) => {
  return (
    <Card title="Khách giữ sách quá hạn >7 ngày">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
          Không có phiếu thuê nào quá hạn trên 7 ngày.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                <th className="px-3.5 py-2.5 font-semibold first:rounded-l-xl">Khách / Phiếu</th>
                <th className="px-3.5 py-2.5 font-semibold">Hạn trả</th>
                <th className="px-3.5 py-2.5 font-semibold last:rounded-r-xl">Trễ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.slipId} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-3">
                    <div className="font-semibold text-slate-900">
                      <Link
                        to={`/customers/${encodeURIComponent(row.customerId)}`}
                        className="hover:text-indigo-600"
                      >
                        {row.customerName}
                      </Link>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">{row.slipNo}</div>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">
                    {formatVnDateOnlyFromIso(row.earliestDueAt)}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-rose-600">
                    {row.daysOverdue} ngày
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link
          to="/pos"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
        >
          Xem danh sách cần thu hồi
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}
