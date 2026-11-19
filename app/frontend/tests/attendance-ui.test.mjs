import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)
const featureFiles = [
  ['features', 'hr', 'hr-shift.type.ts'],
  ['features', 'hr', 'attendance.data.ts'],
  ['features', 'hr', 'pages', 'AttendancePage.tsx'],
  ['features', 'hr', 'components', 'AttendanceCard.tsx'],
  ['features', 'hr', 'components', 'AttendanceDateFilter.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('employee attendance page renders only the current employee attendance cards', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['Điểm danh hôm nay', 'Ngày cần xem', 'Check-in', 'Check-out', 'Giờ công', 'Trạng thái', 'AttendanceCard']) {
    assert.match(source, new RegExp(label))
  }

  for (const state of ['present', 'late', 'absent', 'missing-attendance', 'adjustment-pending']) {
    assert.match(source, new RegExp(state))
  }

  assert.match(source, /Thiếu chấm công/)
  assert.match(source, /type=["']date["']/)
  assert.match(source, /currentEmployee|employeeId/)
  assert.match(source, /attendanceDemoPunchFor/)
  assert.match(source, /'Ca chiều':[\s\S]*13:05/)
  const page = readFeatureFile(['features', 'hr', 'pages', 'AttendancePage.tsx'])
  const card = readFeatureFile(['features', 'hr', 'components', 'AttendanceCard.tsx'])
  assert.match(page, /row\.employeeId === currentEmployeeId/)
  assert.match(page, /row\.workDate === selectedDateLabel/)
  assert.match(page, /isHistorical=\{isHistorical\}/)
  assert.match(card, /disabled=\{!canCheckIn\}/)
  assert.match(card, /disabled=\{!canCheckOut\}/)
  assert.match(card, /disabled=\{isHistorical\}/)
  assert.doesNotMatch(page, /AttendanceTable|AttendanceFilters|Lương ca|Trạng thái lương ca|Tìm nhân viên/i)
})

test('attendance UI keeps incomplete punches explicit and local', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.match(source, /Không tự suy đoán|không suy đoán|Thiếu chấm công/)
  assert.match(source, /Lý do|reason|htmlFor/)
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
