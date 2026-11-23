import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/common'
import { MainLayout as AppLayout } from '@/components/layout'
import { AuthContext } from '@/context/AuthProvider'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { CashCountPanel } from '../components/CashCountPanel'
import { CashLedgerTable } from '../components/CashLedgerTable'
import { CashSummaryCards } from '../components/CashSummaryCards'
import { CloseShiftDialog } from '../components/CloseShiftDialog'
import { ShiftStatusHeader } from '../components/ShiftStatusHeader'
import type { CashDenomination, PosShiftUiState } from '../pos-shift.type'

const initialDenominations: CashDenomination[] = [
  { denomination: 500000, noteCount: 6 },
  { denomination: 200000, noteCount: 5 },
  { denomination: 100000, noteCount: 8 },
  { denomination: 50000, noteCount: 6 },
  { denomination: 20000, noteCount: 5 },
  { denomination: 10000, noteCount: 4 },
  { denomination: 5000, noteCount: 4 },
  { denomination: 2000, noteCount: 2 },
  { denomination: 1000, noteCount: 1 },
]

const sampleLedger = [
  { id: 'pos-042', time: '10:42', reference: 'POS-20261018-042', kind: 'income' as const, amount: 133000 },
  { id: 'rent-021', time: '10:35', reference: 'Hoàn cọc RT-021', kind: 'expense' as const, amount: 2225000 },
]

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export default function PosShiftPage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const session = auth?.session
  const signOut = auth?.signOut
  const [state, setState] = useState<PosShiftUiState>('open')
  const [denominations, setDenominations] = useState(initialDenominations)
  const [isLedgerEmpty, setIsLedgerEmpty] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [explanation, setExplanation] = useState('')
  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  const openingCash = 2000000
  const theoreticalCash = state === 'not-opened' ? 0 : 5265000
  const countedCash = state === 'not-opened'
    ? 0
    : denominations.reduce((sum, row) => sum + row.denomination * row.noteCount, 0)
  const variance = countedCash - theoreticalCash
  const visibleLedger = isLedgerEmpty ? [] : sampleLedger
  const ledgerState: 'populated' | 'empty-ledger' = isLedgerEmpty ? 'empty-ledger' : 'populated'

  const handleStateChange = (nextState: PosShiftUiState) => {
    setState(nextState)
    setIsCloseDialogOpen(false)
    if (nextState === 'variance') {
      setDenominations((rows) => rows.map((row) => row.denomination === 20000 ? { ...row, noteCount: 4 } : row))
    } else if (nextState === 'open' || nextState === 'closed') {
      setDenominations((rows) => rows.map((row) => row.denomination === 20000 ? { ...row, noteCount: 5 } : row))
    }
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Ca làm việc & Két tiền mặt', to: '/pos' }]}
      currentPath="pos"
      onNavigate={(item) => {
        const path = workspacePathFor(item)
        if (path) navigate(path)
      }}
      onSignOut={signOut}
      pageTitle="Ca làm việc & Két tiền mặt"
      actionButton={<div className="flex flex-wrap gap-2"><Button onClick={() => window.print()} size="sm" variant="secondary">In biên bản bàn giao · Ctrl P</Button><Button onClick={() => undefined} size="sm" variant="secondary">Rút tiền két nộp quản lý</Button></div>}
      user={currentUser}
    >
      <div className="space-y-4">
        <ShiftStatusHeader
          openedAt="08:00 · 18/10/2026"
          openedBy="Trần Hải Phong"
          onPrint={() => window.print()}
          onPrimaryAction={() => {
            if (state === 'not-opened') setState('open')
            else if (state === 'closed') window.print()
            else setIsCloseDialogOpen(true)
          }}
          onStateChange={handleStateChange}
          state={state}
        />
        <CashSummaryCards countedCash={countedCash} openingCash={openingCash} theoreticalCash={theoreticalCash} variance={variance} />
        {state === 'not-opened' && (
          <Card title="Chuẩn bị mở ca">
            <div className="flex flex-col gap-3 rounded-xl bg-indigo-50 p-4 text-xs text-indigo-800 sm:flex-row sm:items-center sm:justify-between">
              <p>Ca chưa mở. Chỉ sau khi xác nhận tiền đầu ca, sổ quỹ mới nhận giao dịch.</p>
              <Button onClick={() => setState('open')} size="sm">Mở ca</Button>
            </div>
          </Card>
        )}
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <CashCountPanel denominations={denominations} onChange={(denomination, noteCount) => setDenominations((rows) => rows.map((row) => row.denomination === denomination ? { ...row, noteCount } : row))} readOnly={state === 'closed' || state === 'not-opened'} />
          <CashLedgerTable entries={visibleLedger} onToggleEmpty={() => setIsLedgerEmpty((value) => !value)} />
        </div>
        <span className="sr-only">Sổ quỹ state: {ledgerState}</span>
        {state === 'variance' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            Lệch két {formatVnd(Math.abs(variance))}. Giải trình bắt buộc; biên bản chưa được coi là đã duyệt nếu chưa có Admin xử lý.
          </div>
        )}
        {state === 'closed' && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-700">Ca đã đóng và chỉ đọc. Mọi sửa sai phải đi qua giao dịch điều chỉnh có audit.</div>}
      </div>
      {isCloseDialogOpen && <CloseShiftDialog countedCash={countedCash} explanation={explanation} onClose={() => setIsCloseDialogOpen(false)} onConfirm={() => { setState(variance === 0 ? 'closed' : 'variance'); setIsCloseDialogOpen(false) }} onExplanationChange={setExplanation} theoreticalCash={theoreticalCash} />}
    </AppLayout>
  )
}
