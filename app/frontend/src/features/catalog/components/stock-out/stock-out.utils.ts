import type { SelectOption } from '@/components/common'
import type { StockOutType } from '../../catalog.type'

export type StockOutBookLine = {
  id: string
  copyBarcode: string
  titleName: string
  conditionText: string
  originalCost: number
  lineReason: string
}

export type StockOutHistoryLog = {
  id: string
  timestamp: string
  actor: string
  action: string
  note: string
}

export type StockOutApprovalStage = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED'

export const STOCK_OUT_TYPE_OPTIONS: SelectOption<StockOutType>[] = [
  { value: 'DISPOSAL_DAMAGED', label: 'Xuất hủy sách hư hỏng' },
  { value: 'DISCONTINUED_CIRCULATION', label: 'Ngừng lưu hành / kinh doanh' },
  { value: 'LOST_WRITE_OFF', label: 'Xuất xóa sổ sách thất lạc' },
  { value: 'RETURN_SUPPLIER', label: 'Xuất trả nhà cung cấp' },
]

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN')
}
