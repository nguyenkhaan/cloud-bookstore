import type { CopyAvailability, CopyStatus } from './catalog.type'

export function formatVnd(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

export function availabilityLabel(value: CopyAvailability): string {
  if (value === 'BOTH') return 'Bán + Thuê'
  return value === 'SALE_ONLY' ? 'Chỉ bán' : 'Chỉ cho thuê'
}

export const copyStatusMeta: Record<
  CopyStatus,
  {
    label: string
    tone: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate'
    variant: 'success' | 'warning' | 'danger' | 'brand' | 'neutral'
  }
> = {
  PENDING_RECEIPT: { label: 'Chờ nhập kho', tone: 'amber', variant: 'warning' },
  AVAILABLE: { label: 'Khả dụng', tone: 'emerald', variant: 'success' },
  RENTED: { label: 'Đang cho thuê', tone: 'indigo', variant: 'brand' },
  SOLD: { label: 'Đã bán', tone: 'slate', variant: 'neutral' },
  INVENTORY_LOCKED: { label: 'Khóa kiểm kê', tone: 'amber', variant: 'warning' },
  DAMAGED: { label: 'Hư hỏng', tone: 'rose', variant: 'danger' },
  LOST: { label: 'Thất lạc', tone: 'rose', variant: 'danger' },
  DISPOSED: { label: 'Đã thanh lý', tone: 'slate', variant: 'neutral' },
  DISCONTINUED: { label: 'Ngừng lưu hành', tone: 'slate', variant: 'neutral' },
}
