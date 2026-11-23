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
  ['features', 'hr', 'components', 'WeeklyRoster.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('shift screen presents the Figma weekly roster hierarchy', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['Lập lịch phân ca làm việc', 'Lịch toàn cửa hàng', 'Lịch của tôi', 'Ca sáng', 'Ca chiều', 'Ca tối', 'Cần bổ sung']) {
    assert.match(source, new RegExp(label))
  }

  assert.match(source, /WeeklyRoster/)
  assert.match(source, /isAdminView/)
  assert.match(source, /overflow-x-auto/)
  assert.doesNotMatch(source, /ShiftRecordsTable|ShiftDateToolbar|ShiftRecordDrawer/)
})

test('weekly roster keeps local actions and actor-scoped schedule copy', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.match(source, /Công bố lịch làm việc|Đã công bố/)
  assert.match(source, /Chỉ hiển thị ca làm của bạn/)
  assert.match(source, /button|Button/)
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
