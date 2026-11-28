import type { HrRequestStatus, HrRequestType } from './hr-requests.type'

export const HR_REQUEST_TYPE_LABELS: Record<HrRequestType, string> = {
  shift_swap: 'Đổi ca làm việc',
  leave: 'Xin nghỉ',
  attendance_explanation: 'Giải trình chấm công',
}

export const HR_REQUEST_TYPE_SHORT_LABELS: Record<HrRequestType, string> = {
  shift_swap: 'Đổi ca',
  leave: 'Xin nghỉ',
  attendance_explanation: 'Giải trình chấm công',
}

export const HR_REQUEST_STATUS_LABELS: Record<HrRequestStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}

export const HR_REQUEST_STATUS_OPTIONS: {
  value: HrRequestStatus | ''
  label: string
}[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'cancelled', label: 'Đã hủy' },
]

export const HR_REQUEST_TYPE_OPTIONS: { value: HrRequestType; label: string }[] = [
  { value: 'shift_swap', label: 'Đổi ca làm việc' },
  { value: 'leave', label: 'Xin nghỉ' },
  { value: 'attendance_explanation', label: 'Giải trình chấm công' },
]

export const HR_REQUEST_FORM_TITLES: Record<HrRequestType, string> = {
  shift_swap: 'Tạo yêu cầu đổi ca',
  leave: 'Tạo yêu cầu xin nghỉ',
  attendance_explanation: 'Tạo yêu cầu giải trình công',
}

export const HR_REQUEST_SHIFT_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: 'Ca 1' },
  { value: '2', label: 'Ca 2' },
  { value: '3', label: 'Ca 3' },
]

export const HR_REQUEST_ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'đã gửi yêu cầu',
  CANCELLED: 'đã hủy yêu cầu',
  APPROVED: 'đã phê duyệt yêu cầu',
  REJECTED: 'đã từ chối yêu cầu',
}

export function buildHrRequestMonthOptions(
  reference = new Date(),
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const cursor = new Date(reference.getFullYear(), reference.getMonth(), 1)
  for (let index = 0; index < 6; index += 1) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    options.push({
      value: `${year}-${String(month).padStart(2, '0')}`,
      label: `Tháng ${month}/${year}`,
    })
    cursor.setMonth(cursor.getMonth() - 1)
  }
  options.push({ value: 'all', label: 'Tất cả tháng' })
  return options
}
