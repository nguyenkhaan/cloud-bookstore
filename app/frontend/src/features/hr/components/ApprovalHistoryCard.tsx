import { Info } from 'lucide-react'
import { Card } from '@/components/common/Card'
import type { HrRequestRecord } from '../hr-requests.type'

export interface ApprovalHistoryCardProps {
  request: HrRequestRecord | null
}

export function ApprovalHistoryCard({ request }: ApprovalHistoryCardProps) {
  if (!request) return null

  return (
    <Card
      padding="lg"
      title={`Lịch sử phê duyệt · ${request.code}`}
    >
      <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
        {request.history.map((entry) => (
          <p key={entry.id}>
            {entry.timestamp ? `${entry.timestamp} - ${entry.message}` : entry.message}
          </p>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-indigo-50 px-3.5 py-3 text-xs text-indigo-700">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Đơn được duyệt mới cập nhật Roster hoặc bảng công. Không tự ý bỏ ca khi yêu cầu còn chờ.
        </span>
      </div>
    </Card>
  )
}
