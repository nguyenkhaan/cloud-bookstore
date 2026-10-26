import type { ServerStatus } from '../hooks/useServerStatus'

const labels: Record<ServerStatus, string> = {
  checking: 'Đang kiểm tra máy chủ',
  online: 'Máy chủ online',
  offline: 'Không kết nối được máy chủ',
}

export function ServerStatusBadge({ status }: { status: ServerStatus }) {
  return (
    <span className={`cb-status cb-status--${status}`} role="status">
      <span aria-hidden="true" className="cb-status__dot" />
      {labels[status]}
    </span>
  )
}
