import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)
const featureFiles = [
  ['features', 'hr', 'hr-shift.type.ts'],
  ['features', 'hr', 'pages', 'ShiftRecordsPage.tsx'],
  ['features', 'hr', 'components', 'ShiftDateToolbar.tsx'],
  ['features', 'hr', 'components', 'ShiftSummaryCards.tsx'],
  ['features', 'hr', 'components', 'ShiftRecordsTable.tsx'],
  ['features', 'hr', 'components', 'ShiftRecordDrawer.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('shift records are a daily view, not a schedule module', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['Phân công ca', 'Bản ghi ca', 'Ngày làm', 'Nhân viên', 'Thứ tự ca', 'Trạng thái']) {
    assert.match(source, new RegExp(label))
  }

  for (const state of ['assigned', 'unassigned', 'attendance-missing', 'empty']) {
    assert.match(source, new RegExp(state))
  }

  for (const field of ['Ghi chú']) assert.match(source, new RegExp(field))
  assert.doesNotMatch(source, /lịch tuần|lịch tháng|lịch lặp|lặp lại|kỳ lương|bảng lương/i)
})

test('shift-record UI stays local and keeps filters keyboard-ready', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.match(source, /Ngày làm|type="date"/)
  assert.match(source, /SelectBox|select/i)
  assert.match(source, /aria-label|htmlFor/)
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
