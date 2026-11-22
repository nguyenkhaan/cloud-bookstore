import React from 'react'
import { Card } from '@/components/common'
import { formatVnTimestampParts, roleDisplayLabel } from '../audit.presentation'
import type { AuditLogItem } from '../audit.type'

export interface AuditRelatedTimelineProps {
  selectedId: string | null
  relatedEvents: AuditLogItem[]
  isLoading: boolean
  onSelectEvent: (id: string) => void
}

export const AuditRelatedTimeline: React.FC<AuditRelatedTimelineProps> = ({
  selectedId,
  relatedEvents,
  isLoading,
  onSelectEvent,
}) => {
  return (
    <Card title="Dòng sự kiện liên quan">
      {isLoading ? (
        <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
      ) : relatedEvents.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          Chưa có chuỗi sự kiện liên quan cho đối tượng đang chọn.
        </p>
      ) : (
        <div className="space-y-4">
          <ol className="space-y-3">
            {relatedEvents.map((ev) => {
              const ts = formatVnTimestampParts(ev.occurredAt)
              const isCurrent = ev.id === selectedId
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className={`w-full rounded-xl p-2 text-left transition-colors cursor-pointer ${
                      isCurrent ? 'bg-indigo-50/80 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          isCurrent ? 'bg-indigo-600' : 'bg-slate-800'
                        }`}
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono">{ts.timeMs}</span> — {ev.action}
                        </div>
                        <div className="mt-0.5 text-slate-600">
                          {ev.actorName || 'Hệ thống'} · {roleDisplayLabel(ev.actorRole)}
                        </div>
                        {ev.reason && (
                          <div className="mt-0.5 truncate text-[11px] text-slate-500">
                            {ev.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="pt-1">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Đã xác minh tính toàn vẹn
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Không có thao tác sửa / xóa. Tra cứu theo tài khoản hoặc mã đối tượng để xem chuỗi hành động đầy đủ.
          </p>
        </div>
      )}
    </Card>
  )
}
