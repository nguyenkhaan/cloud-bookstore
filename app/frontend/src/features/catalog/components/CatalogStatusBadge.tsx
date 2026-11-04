import { Badge } from '@/components/common'
import type { CopyStatus } from '../catalog.type'

const copyStatusLabels: Record<CopyStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  DAMAGED: 'Hư hỏng',
  PENDING_RECEIPT: 'Chờ nhập kho',
  RENTED: 'Đang cho thuê',
  SOLD: 'Đã bán',
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Đang dùng' : 'Ngừng dùng'}</Badge>
}

export function CopyStatusBadge({ status }: { status: CopyStatus }) {
  const variant = status === 'AVAILABLE' ? 'success' : status === 'RENTED' ? 'info' : status === 'DAMAGED' ? 'danger' : 'warning'
  return <Badge variant={variant}>{copyStatusLabels[status]}</Badge>
}
