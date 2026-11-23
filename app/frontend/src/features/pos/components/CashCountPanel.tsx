import { Card } from '@/components/common'
import type { CashDenomination } from '../pos-shift.type'

type CashCountPanelProps = {
  denominations: CashDenomination[]
  readOnly?: boolean
  onChange: (denomination: number, noteCount: number) => void
}

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export function CashCountPanel({ denominations, readOnly = false, onChange }: CashCountPanelProps) {
  const total = denominations.reduce((sum, row) => sum + row.denomination * row.noteCount, 0)

  return (
    <Card
      action={<span className="text-xs text-slate-400">Đơn vị VND</span>}
      padding="lg"
      title="Kiểm đếm tiền mặt"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-100 text-left text-xs">
          <thead className="bg-indigo-50 text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="rounded-l-lg px-3 py-2.5">Mệnh giá</th>
              <th className="px-3 py-2.5">Số tờ</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {denominations.map((row) => (
              <tr key={row.denomination}>
                <th className="px-3 py-2.5 font-semibold text-slate-800">{formatVnd(row.denomination)}</th>
                <td className="px-3 py-2.5">
                  <label className="sr-only" htmlFor={`cash-${row.denomination}`}>Số tờ mệnh giá {formatVnd(row.denomination)}</label>
                  <input
                    aria-label={`Số tờ mệnh giá ${formatVnd(row.denomination)}`}
                    className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={readOnly}
                    id={`cash-${row.denomination}`}
                    min="0"
                    onChange={(event) => onChange(row.denomination, Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={row.noteCount}
                  />
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500">{formatVnd(row.denomination * row.noteCount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="px-3 pt-4 text-left text-xs font-medium text-slate-500" colSpan={2}>Tổng tiền kiểm đếm thực tế</th>
              <td className="px-3 pt-4 text-right text-lg font-bold text-emerald-600">{formatVnd(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
