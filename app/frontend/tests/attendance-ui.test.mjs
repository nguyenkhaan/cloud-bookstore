import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)
const featureFiles = [
  ['features', 'hr', 'hr-shift.type.ts'],
  ['features', 'hr', 'pages', 'AttendancePage.tsx'],
  ['features', 'hr', 'components', 'TodayAttendanceCard.tsx'],
  ['features', 'hr', 'components', 'AttendanceSummaryCards.tsx'],
  ['features', 'hr', 'components', 'AttendanceFilters.tsx'],
  ['features', 'hr', 'components', 'AttendanceTable.tsx'],
  ['features', 'hr', 'components', 'AttendanceAdjustmentDialog.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('SCR-HRM-03 tracks attendance and pay per shift', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['SCR-HRM-03', 'Điểm danh hôm nay', 'Nhân viên', 'Ngày làm', 'Thứ tự ca', 'Check-in', 'Check-out', 'Giờ công', 'Trạng thái', 'Lương ca']) {
    assert.match(source, new RegExp(label))
  }

  for (const state of ['present', 'late', 'absent', 'missing-attendance', 'adjustment-pending', 'paid', 'unpaid']) {
    assert.match(source, new RegExp(state))
  }

  assert.match(source, /Thiếu chấm công/)
  assert.match(source, /Đang chờ Admin duyệt/)
  assert.match(source, /Đã trả/)
  assert.match(source, /Chưa trả/)
  assert.doesNotMatch(source, /khóa công tháng|mở khóa kỳ|bảng lương theo kỳ|bảng lương tháng/i)
})

test('attendance UI keeps incomplete punches explicit and local', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.match(source, /Không tự suy đoán|không suy đoán|Thiếu chấm công/)
  assert.match(source, /Lý do|reason|htmlFor/)
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
