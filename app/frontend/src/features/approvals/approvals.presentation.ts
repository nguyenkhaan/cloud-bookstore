import type { ApprovalStatus, BookCopyStatus, InventoryAdjustmentStatus, InventoryVarianceType } from './approvals.type'

export function approvalStatusMeta(status: InventoryAdjustmentStatus): { label: string; className: string } {
  switch (status) {
    case 'PENDING_APPROVAL':
      return {
        label: 'Chờ duyệt',
        className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 border border-amber-200',
      }
    case 'APPROVED':
      return {
        label: 'Đã duyệt',
        className: 'bg-blue-50 text-blue-800 ring-1 ring-blue-600/20 border border-blue-200',
      }
    case 'APPLIED':
      return {
        label: 'Đã áp dụng',
        className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 border border-emerald-200',
      }
    case 'REJECTED':
      return {
        label: 'Từ chối',
        className: 'bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 border border-rose-200',
      }
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20 border border-slate-200',
      }
    default:
      return {
        label: status,
        className: 'bg-slate-100 text-slate-700',
      }
  }
}

export function approvalGeneralStatusMeta(status: ApprovalStatus | undefined): { label: string; className: string } {
  switch (status) {
    case 'PENDING_APPROVAL':
      return {
        label: 'Chờ duyệt',
        className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 border border-amber-200',
      }
    case 'APPROVED':
      return {
        label: 'Đã phê duyệt',
        className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 border border-emerald-200',
      }
    case 'REJECTED':
      return {
        label: 'Đã từ chối',
        className: 'bg-rose-50 text-rose-800 ring-1 ring-rose-600/20 border border-rose-200',
      }
    case 'COMPLETED':
      return {
        label: 'Hoàn tất',
        className: 'bg-blue-50 text-blue-800 ring-1 ring-blue-600/20 border border-blue-200',
      }
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20 border border-slate-200',
      }
    case 'DRAFT':
      return {
        label: 'Bản nháp',
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      }
    default:
      return {
        label: status ?? '—',
        className: 'bg-slate-100 text-slate-700',
      }
  }
}

export function conditionGradeMeta(grade?: string | null): { label: string; className: string } {
  const g = (grade ?? '').toUpperCase()
  if (g.includes('A')) {
    return { label: 'Grade A (Mới 90-99%)', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
  if (g.includes('B')) {
    return { label: 'Grade B (Tốt 75-89%)', className: 'bg-blue-50 text-blue-700 border-blue-200' }
  }
  if (g.includes('C')) {
    return { label: 'Grade C (Khá 60-74%)', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  if (g.includes('D')) {
    return { label: 'Grade D (Cũ <60%)', className: 'bg-rose-50 text-rose-700 border-rose-200' }
  }
  return { label: grade ?? 'Chưa thẩm định', className: 'bg-slate-50 text-slate-600 border-slate-200' }
}

export function reversalTypeMeta(type: string): { label: string; className: string } {
  if (type === 'HỦY_HÓA_ĐƠN_BÁN' || type.includes('REVERSAL')) {
    return {
      label: 'Đảo/Hủy hóa đơn 24h',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    }
  }
  return {
    label: 'Xuất hủy sách hỏng',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  }
}

export function copyStatusLabel(status: BookCopyStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Sẵn sàng'
    case 'DAMAGED':
      return 'Hư hỏng'
    case 'LOST':
      return 'Mất sách'
    case 'RENTED':
      return 'Đang cho thuê'
    case 'SOLD':
      return 'Đã bán'
    case 'INVENTORY_LOCKED':
      return 'Khóa kiểm kê'
    case 'PENDING_RECEIPT':
      return 'Chờ nhập kho'
    case 'DISPOSED':
      return 'Đã thanh lý'
    case 'DISCONTINUED':
      return 'Ngừng sử dụng'
    default:
      return status
  }
}

export function varianceMeta(variance: InventoryVarianceType): { label: string; className: string } {
  switch (variance) {
    case 'MISSING':
      return {
        label: 'THIẾU',
        className: 'bg-rose-100 text-rose-800 border border-rose-200 font-bold',
      }
    case 'DAMAGED':
      return {
        label: 'HƯ HỎNG',
        className: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold',
      }
    case 'UNEXPECTED_STATUS':
      return {
        label: 'SAI TRẠNG THÁI',
        className: 'bg-purple-100 text-purple-800 border border-purple-200 font-bold',
      }
    case 'NONE':
      return {
        label: 'KHỚP',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold',
      }
    default:
      return {
        label: variance,
        className: 'bg-slate-100 text-slate-800 border border-slate-200',
      }
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatVnd(value?: number | null): string {
  if (value === null || value === undefined) return '0 đ'
  return `${value.toLocaleString('vi-VN')} đ`
}
