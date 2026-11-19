import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)
const featureFiles = [
  ['features', 'pos', 'pos-shift.type.ts'],
  ['features', 'pos', 'pages', 'PosShiftPage.tsx'],
  ['features', 'pos', 'components', 'ShiftStatusHeader.tsx'],
  ['features', 'pos', 'components', 'CashSummaryCards.tsx'],
  ['features', 'pos', 'components', 'CashCountPanel.tsx'],
  ['features', 'pos', 'components', 'CashLedgerTable.tsx'],
  ['features', 'pos', 'components', 'CloseShiftDialog.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('SCR-POS-01 contains the cash-shift states and operational summary', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['SCR-POS-01', 'Ca làm việc & Két tiền mặt', 'Tiền đầu ca', 'Tiền lý thuyết', 'Tiền đã kiểm đếm', 'Chênh lệch', 'Kiểm đếm tiền mặt', 'Sổ quỹ ca làm việc']) {
    assert.match(source, new RegExp(label))
  }

  for (const state of ['not-opened', 'open', 'closed', 'variance', 'empty-ledger']) {
    assert.match(source, new RegExp(state))
  }

  assert.match(source, /Giải trình chênh lệch/)
  assert.match(source, /Admin xử lý|Admin duyệt/)
})

test('POS shift UI stays local and does not introduce data access layers', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
