import type {
  PayslipDisputeCategory,
  PayslipDisputeStatus,
  PayrollPeriodStatus,
  ZaloSendStatus,
} from './hr-payroll.type'

export const PAYROLL_PERIOD_OPTIONS: { value: string; label: string }[] = []
export const PAYROLL_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  draft: 'Bản nháp',
  approved_unpaid: 'Đã duyệt & Khóa',
  partially_paid: 'Đã duyệt & Khóa',
  settled: 'Đã duyệt & Khóa',
}
export const PAYOUT_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả chi trả' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'partial', label: 'Thanh toán một phần' },
]
export const PAYROLL_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'approved_unpaid', label: 'Đã duyệt & Khóa' },
]
export const ZALO_STATUS_LABELS: Record<ZaloSendStatus, string> = {
  sent: 'Đã gửi', unsent: 'Chưa gửi', failed: 'Lỗi gửi',
}
export const PAYSLIP_DISPUTE_CATEGORY_OPTIONS: { value: PayslipDisputeCategory; label: string }[] = [
  { value: 'allowance', label: 'Phụ cấp' },
  { value: 'base_salary', label: 'Lương công' },
  { value: 'overtime', label: 'OT' },
  { value: 'bonus', label: 'Thưởng' },
  { value: 'deduction', label: 'Khấu trừ' },
]
export const PAYSLIP_DISPUTE_CATEGORY_LABELS: Record<PayslipDisputeCategory, string> = {
  base_salary: 'Lương công', overtime: 'OT', bonus: 'Thưởng', allowance: 'Phụ cấp', deduction: 'Khấu trừ',
}
export const PAYSLIP_DISPUTE_STATUS_LABELS: Record<PayslipDisputeStatus, string> = {
  pending_response: 'Chờ quản lý phản hồi', explained: 'Đã giải trình', approved_next_period: 'Đã duyệt bù trừ kỳ sau',
}
export const ADJUSTMENT_CATEGORY_OPTIONS = [
  { value: 'Phụ cấp', label: 'Phụ cấp' }, { value: 'Lương công', label: 'Lương công' },
  { value: 'OT', label: 'OT' }, { value: 'Thưởng', label: 'Thưởng' }, { value: 'Khấu trừ', label: 'Khấu trừ' },
]
export const ADJUSTMENT_TYPE_OPTIONS = [
  { value: 'add_next_period' as const, label: 'Cộng bù vào lương kỳ sau' },
  { value: 'deduct_next_period' as const, label: 'Khấu trừ vào lương kỳ sau' },
]
export const ADJUSTMENT_TARGET_PERIOD_OPTIONS: { value: string; label: string }[] = []

export function formatVnd(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0
  return `${safe < 0 ? '-' : ''}${Math.abs(safe).toLocaleString('vi-VN')}đ`
}

export function numberToVietnameseWords(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'Không đồng.'
  return `${formatVnd(value).replace('đ', '')} đồng.`
}

export function formatVietnamDateTime(value?: string | Date): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function formatVietnamDate(value?: string | Date): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(date)
}

export function formatVietnamTime(value?: string | Date): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatIsoDateOnly(value?: string | null): string {
  if (!value) return '-'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return formatVietnamDate(value)
}

export function toIsoDateOnly(value: string): string {
  const trimmed = value.trim()
  const vnMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (vnMatch) return `${vnMatch[3]}-${vnMatch[2]}-${vnMatch[1]}`
  return trimmed
}

export function getNextPeriodKeys(sourcePeriodKey: string, count = 3): { value: string; label: string }[] {
  const match = /^(\d{2})\/(\d{4})$/.exec(sourcePeriodKey.trim())
  const now = new Date()
  let month = match ? Number(match[1]) : now.getMonth() + 1
  let year = match ? Number(match[2]) : now.getFullYear()
  const options: { value: string; label: string }[] = []
  for (let i = 0; i < count; i += 1) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    const key = `${String(month).padStart(2, '0')}/${year}`
    options.push({ value: key, label: `Kỳ ${key}` })
  }
  return options
}
