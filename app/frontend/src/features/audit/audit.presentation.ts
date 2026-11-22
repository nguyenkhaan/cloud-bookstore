import type { AuditLogItem } from './audit.type'

export function formatVnTimestampParts(iso?: string | null): { date: string; timeMs: string; isoOffset: string } {
  if (!iso) return { date: '—', timeMs: '', isoOffset: '—' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: iso, timeMs: '', isoOffset: iso }

  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const yyyy = vn.getUTCFullYear()
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(vn.getUTCDate()).padStart(2, '0')
  const hh = String(vn.getUTCHours()).padStart(2, '0')
  const mi = String(vn.getUTCMinutes()).padStart(2, '0')
  const ss = String(vn.getUTCSeconds()).padStart(2, '0')
  const ms = String(vn.getUTCMilliseconds()).padStart(3, '0')

  return {
    date: `${dd}/${mm}/${yyyy}`,
    timeMs: `${hh}:${mi}:${ss}.${ms}`,
    isoOffset: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}+07:00`,
  }
}

export function roleDisplayLabel(roleCode?: string | null): string {
  switch ((roleCode ?? '').toUpperCase()) {
    case 'ADMIN':
      return 'Admin'
    case 'INVENTORY_MANAGER':
      return 'Quản lý kho'
    case 'CASHIER':
      return 'Thu ngân'
    default:
      return roleCode || 'Hệ thống'
  }
}

export function moduleDisplayLabel(entityType?: string | null): string {
  const norm = (entityType ?? '').trim().toLowerCase()
  switch (norm) {
    case 'bookcopy':
    case 'book_copy':
    case 'bookseries':
    case 'book_series':
    case 'title':
    case 'titles':
    case 'edition':
    case 'editions':
    case 'category':
    case 'categories':
    case 'stockreceipt':
    case 'stock_receipt':
    case 'inventorycheck':
    case 'inventory_check':
    case 'inventory_adjustment':
    case 'inventoryadjustment':
    case 'inventoryadjustmentrequest':
      return 'Kho'
    case 'saleinvoice':
    case 'sale_invoice':
    case 'rentalslip':
    case 'rental_slip':
    case 'return':
    case 'payment':
    case 'cashsession':
    case 'cash_session':
      return 'POS'
    case 'employeeworkrecord':
    case 'employee':
    case 'payroll':
      return 'Nhân sự'
    case 'customer':
    case 'customers':
      return 'Khách hàng'
    case 'buyback_approval':
    case 'damage_penalty_approval':
    case 'disposal_reversal_approval':
      return 'Phê duyệt'
    default:
      return entityType || 'Hệ thống'
  }
}

export function isBookCopyEntity(entityType?: string | null): boolean {
  const norm = (entityType ?? '').trim().toLowerCase()
  return norm === 'bookcopy' || norm === 'book_copy'
}

export function formatShortDevice(userAgent?: string | null): string {
  if (!userAgent) return 'API Client / Nội bộ'
  if (userAgent.length <= 34 && !userAgent.includes('Mozilla/')) return userAgent

  let browser = 'Trình duyệt'
  if (userAgent.includes('Edg/')) {
    const m = userAgent.match(/Edg\/(\d+)/)
    browser = `Edge ${m?.[1] ?? ''}`.trim()
  } else if (userAgent.includes('Chrome/')) {
    const m = userAgent.match(/Chrome\/(\d+)/)
    browser = `Chrome ${m?.[1] ?? ''}`.trim()
  } else if (userAgent.includes('Firefox/')) {
    const m = userAgent.match(/Firefox\/(\d+)/)
    browser = `Firefox ${m?.[1] ?? ''}`.trim()
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    browser = 'Safari'
  }

  let os = 'Web'
  if (userAgent.includes('Windows NT 10')) os = 'Windows'
  else if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac OS X')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'

  return `${browser} / ${os}`
}

export function parseJsonEntries(jsonStr?: string | null): Array<[string, string]> {
  if (!jsonStr) return []
  try {
    const parsed: unknown = JSON.parse(jsonStr)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [['Giá trị', String(parsed)]]
    }
    return Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
      k,
      v === null || v === undefined
        ? '—'
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v),
    ])
  } catch {
    return [['Dữ liệu', jsonStr]]
  }
}

export function summarizeTransition(item: AuditLogItem): { target: string; diff: string } {
  const target = item.entityLabel || item.entityId.slice(0, 8).toUpperCase()
  const beforeEntries = parseJsonEntries(item.beforeData)
  const afterEntries = parseJsonEntries(item.afterData)

  if (beforeEntries.length === 0 && afterEntries.length === 0) {
    return { target, diff: item.action }
  }

  const afterMap = new Map(afterEntries)
  const beforeMap = new Map(beforeEntries)

  for (const [key, beforeVal] of beforeEntries) {
    const afterVal = afterMap.get(key)
    if (afterVal !== undefined && afterVal !== beforeVal) {
      return { target, diff: `${beforeVal} → ${afterVal}` }
    }
  }

  if (beforeEntries.length === 0 && afterEntries.length > 0) {
    const [k, v] = afterEntries[0]
    return { target, diff: `Khởi tạo (${k}: ${v})` }
  }

  if (afterEntries.length === 0 && beforeEntries.length > 0) {
    const [k, v] = beforeEntries[0]
    return { target, diff: `${k}: ${v} → Đã xóa` }
  }

  const firstKey = afterEntries[0]?.[0] ?? beforeEntries[0]?.[0]
  return {
    target,
    diff: `${beforeMap.get(firstKey ?? '') ?? '—'} → ${afterMap.get(firstKey ?? '') ?? '—'}`,
  }
}
