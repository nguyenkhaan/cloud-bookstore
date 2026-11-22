import React from 'react'
import { History, Info } from 'lucide-react'
import { Card } from '@/components/common'
import {
  formatShortDevice,
  formatVnTimestampParts,
  isBookCopyEntity,
  parseJsonEntries,
  roleDisplayLabel,
} from '../audit.presentation'
import type { AuditLogItem } from '../audit.type'

export interface AuditDetailPanelProps {
  log: AuditLogItem | null
  isLoading: boolean
  onOpenCopyLifecycle: (copyId: string) => void
}

export const AuditDetailPanel: React.FC<AuditDetailPanelProps> = ({
  log,
  isLoading,
  onOpenCopyLifecycle,
}) => {
  if (isLoading) {
    return (
      <Card>
        <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
      </Card>
    )
  }

  if (!log) {
    return (
      <Card>
        <p className="py-12 text-center text-sm text-slate-500">
          Chọn một dòng nhật ký ở bảng trên để xem đối chiếu Trước / Sau và thông tin thiết bị.
        </p>
      </Card>
    )
  }

  const ts = formatVnTimestampParts(log.occurredAt)
  const beforeEntries = parseJsonEntries(log.beforeData)
  const afterEntries = parseJsonEntries(log.afterData)
  const entityDisplay = log.entityLabel || log.entityId

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Chi tiết thay đổi · <span className="font-mono">{log.action}</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {log.logCode}
            {log.correlationId ? ` · Correlation: ${log.correlationId}` : ''}
          </p>
        </div>

        {isBookCopyEntity(log.entityType) && (
          <button
            type="button"
            onClick={() => onOpenCopyLifecycle(log.entityId)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
          >
            <History className="h-3.5 w-3.5" />
            Xem vòng đời bản sách 360°
          </button>
        )}
      </div>

      {/* Before / After Diff */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
            TRƯỚC THAY ĐỔI
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-slate-800 font-mono">
            <div>
              {log.entityType}: {entityDisplay}
            </div>
            {beforeEntries.length > 0 ? (
              beforeEntries.map(([k, v]) => (
                <div key={k} className="break-all">
                  {k}: {v}
                </div>
              ))
            ) : (
              <div className="text-slate-400 italic">Không có snapshot trước thay đổi</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            SAU THAY ĐỔI
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-slate-800 font-mono">
            <div>
              {log.entityType}: {entityDisplay}
            </div>
            {afterEntries.length > 0 ? (
              afterEntries.map(([k, v]) => (
                <div key={k} className="break-all">
                  {k}: {v}
                </div>
              ))
            ) : (
              <div className="text-slate-400 italic">Không có snapshot sau thay đổi</div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Reason */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <span className="font-semibold">Lý do bắt buộc:</span> {log.reason || 'Không ghi nhận lý do'}
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="mt-4 space-y-1 text-xs text-slate-500">
        <div>
          Người thực hiện: <span className="font-medium text-slate-700">{log.actorName || 'Hệ thống'}</span> ·{' '}
          {roleDisplayLabel(log.actorRole)}
        </div>
        <div>
          IP: <span className="font-mono">{log.ipAddress || '127.0.0.1'}</span> · {formatShortDevice(log.userAgent)}
        </div>
        <div>
          Thời điểm máy chủ: <span className="font-mono">{ts.isoOffset}</span>
        </div>
      </div>
    </Card>
  )
}
