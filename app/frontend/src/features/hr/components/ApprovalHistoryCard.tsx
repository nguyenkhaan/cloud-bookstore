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
    </Card>
  )
}
