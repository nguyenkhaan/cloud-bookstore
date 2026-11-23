import type { ServerStatus } from '@/features/auth/auth.type'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'

const labels: Record<ServerStatus, string> = {
  checking: 'Đang kiểm tra máy chủ',
  online: 'Máy chủ online',
  offline: 'Không kết nối được máy chủ',
}

const variants: Record<ServerStatus, BadgeVariant> = {
  checking: 'neutral',
  online: 'success',
  offline: 'danger',
}

export function ServerStatusBadge({ status }: { status: ServerStatus }) {
  return (
    <Badge dot pulse={status === 'checking'} role="status" size="sm" variant={variants[status]}>
      {labels[status]}
    </Badge>
  )
}
