import { useSettingsHistory } from '../settings.hook'

function pretty(value: string | null | undefined) {
  if (!value) return '—'
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return 'Không đọc được bản ghi.' }
}

export function SettingsHistory({ group, isAdmin }: { group: string; isAdmin: boolean }) {
  const query = useSettingsHistory(group, isAdmin)
  if (!isAdmin) return null
  return <section className="min-w-0 space-y-3 border-t border-slate-200 pt-5" aria-labelledby={`history-${group}`}>
    <h2 id={`history-${group}`} className="text-base font-semibold text-slate-900">Lịch sử thay đổi · 100 lần gần nhất</h2>
    {query.isPending ? <p role="status">Đang tải lịch sử…</p> : query.isError ? <div role="alert"><p>Không thể tải lịch sử.</p><button type="button" className="min-h-11 underline" onClick={() => void query.refetch()}>Thử lại</button></div> : <>
      {!query.data?.length && <p className="text-sm text-slate-500">Chưa có thay đổi được ghi nhận.</p>}
      {query.data?.map(item => <details key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer break-words">{new Date(item.effectiveAt).toLocaleString('vi-VN')} · {item.actorName || item.actorId || 'Hệ thống'} · {item.reason}</summary>
        <p className="mb-3 text-xs text-slate-500">Có hiệu lực ngay tại thời điểm lưu. Secret được che trong bản ghi.</p>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">{[['Giá trị cũ', item.beforeJson], ['Giá trị mới', item.afterJson]].map(([title, data]) => <div key={title} className="min-w-0">
          <h3 className="font-semibold">{title}</h3><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs">{pretty(data)}</pre>
        </div>)}</div>
      </details>)}
    </>}
  </section>
}
