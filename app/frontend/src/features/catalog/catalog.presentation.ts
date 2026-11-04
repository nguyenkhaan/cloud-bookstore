import type { CopyAvailability } from './catalog.type'

export function formatVnd(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

export function availabilityLabel(value: CopyAvailability): string {
  if (value === 'BOTH') return 'Bán + Thuê'
  return value === 'SALE_ONLY' ? 'Chỉ bán' : 'Chỉ cho thuê'
}
