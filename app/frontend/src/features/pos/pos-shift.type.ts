export type PosShiftUiState = 'not-opened' | 'open' | 'closed' | 'variance'

export type CashDenomination = {
  denomination: number
  noteCount: number
}

export type CashLedgerEntry = {
  id: string
  time: string
  reference: string
  kind: 'income' | 'expense'
  amount: number
}

export type PosShiftDisplay = {
  state: PosShiftUiState
  openingCash: number
  theoreticalCash: number
  countedCash: number
  openedBy: string
  openedAt: string
  counterName: string
  denominations: CashDenomination[]
  ledger: CashLedgerEntry[]
}
