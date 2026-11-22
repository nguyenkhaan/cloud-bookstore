import { Button, Card } from '@/components/common'
import type { CashLedgerEntry } from '../pos-shift.type'

type CashLedgerTableProps = {
  entries: CashLedgerEntry[]
  onToggleEmpty: () => void
}

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export function CashLedgerTable({ entries, onToggleEmpty }: CashLedgerTableProps) {
  return (
    <Card
      action={<Button aria-label="Chuyển trạng thái sổ quỹ rỗng" onClick={onToggleEmpty} size="xs" variant="ghost">{entries.length ? 'Sổ quỹ rỗng' : 'Hiện giao dịch mẫu'}</Button>}
      padding="lg"
      title="Sổ quỹ ca làm việc"
    >
      {entries.length === 0 ? (
        <div className="flex min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">Sổ quỹ đang rỗng</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Chưa có giao dịch trong ca. Summary và tiền kiểm đếm vẫn được giữ để đối soát.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-100 text-left text-xs">
            <thead className="bg-indigo-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="rounded-l-lg px-3 py-2.5">Giao dịch gần nhất</th>
                <th className="px-3 py-2.5 text-right">Thu</th>
                <th className="rounded-r-lg px-3 py-2.5 text-right">Chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <th className="px-3 py-3 font-semibold text-slate-800">{entry.time} · {entry.reference}</th>
                  <td className="px-3 py-3 text-right text-emerald-600">{entry.kind === 'income' ? `+ ${formatVnd(entry.amount)}` : '—'}</td>
                  <td className="px-3 py-3 text-right text-rose-600">{entry.kind === 'expense' ? `− ${formatVnd(entry.amount)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
