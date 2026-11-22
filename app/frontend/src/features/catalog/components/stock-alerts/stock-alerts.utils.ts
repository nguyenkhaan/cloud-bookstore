import type { KeyboardEvent } from 'react'
import type { SelectOption } from '@/components/common'
import type { EditionStockAlertItem } from '../../catalog.type'

export type AlertSeverity = 'ALL' | 'OUT_OF_STOCK' | 'BOTH_LOW' | 'RENTAL_LOW' | 'SALE_LOW' | 'OK'
export type ChannelFilter = 'ALL' | 'SALE' | 'RENTAL'

export const SEVERITY_OPTIONS: SelectOption<AlertSeverity>[] = [
  { value: 'ALL', label: 'Ấn bản: Tất cả' },
  { value: 'OUT_OF_STOCK', label: 'Hết khả dụng' },
  { value: 'BOTH_LOW', label: 'Thiếu Bán & Thuê' },
  { value: 'RENTAL_LOW', label: 'Thiếu kho thuê' },
  { value: 'SALE_LOW', label: 'Thiếu kho bán' },
  { value: 'OK', label: 'Đủ tồn an toàn' },
]

export const CHANNEL_FILTER_OPTIONS: SelectOption<ChannelFilter>[] = [
  { value: 'ALL', label: 'Kênh: Tất cả' },
  { value: 'SALE', label: 'Kênh Bán lẻ' },
  { value: 'RENTAL', label: 'Kênh Cho thuê' },
]

const ALLOWED_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
])

export function formatEditionDisplay(item: EditionStockAlertItem): string {
  const pubPart = [item.publisher, item.publishYear].filter(Boolean).join(' ')
  return pubPart ? `${item.titleName} (${pubPart})` : item.titleName
}

export function formatSupplierOptionLabel(code?: string | null, name?: string | null): string {
  if (!name) return 'Chưa gắn NCC ưu tiên'
  return `${code ?? 'NCC'} - ${name} - ISBN thuộc ấn bản, không thuộc tác phẩm`
}

export function getChannelRestockAmounts(item: EditionStockAlertItem) {
  const saleAdd = item.isSaleLow ? Math.max(1, item.saleDeficit) : 0
  const rentalAdd = item.isRentalLow ? Math.max(1, item.rentalDeficit) : 0
  return { saleAdd, rentalAdd }
}

export function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function blockNonDigitKeys(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (ALLOWED_CONTROL_KEYS.has(event.key)) return
  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}
