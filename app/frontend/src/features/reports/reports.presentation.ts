export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function formatVnd(amount: number | string | null | undefined): string {
  const safe = toNumber(amount)
  return `${Math.round(safe).toLocaleString('vi-VN')}đ`
}

export function formatSignedVnd(amount: number | string | null | undefined, positivePrefix = '+'): string {
  const safe = Math.round(toNumber(amount))
  if (safe > 0) return `${positivePrefix}${safe.toLocaleString('vi-VN')}đ`
  if (safe < 0) return `−${Math.abs(safe).toLocaleString('vi-VN')}đ`
  return '0đ'
}

export function formatMillions(amount: number | string | null | undefined): string {
  const safe = toNumber(amount) / 1_000_000
  return safe.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatVnDateShort(dateOnly?: string | null): string {
  if (!dateOnly) return '—'
  const parts = dateOnly.split('-')
  if (parts.length !== 3) return dateOnly
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function formatVnDateTimeShort(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function formatVnDateOnlyFromIso(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function getCurrentVnMonthRange(): { from: string; to: string; year: number; month: number } {
  const now = new Date()
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const year = vn.getUTCFullYear()
  const month = vn.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    year,
    month,
  }
}

export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function depositStatusBadgeVariant(statusCode?: string | null): 'brand' | 'danger' | 'warning' | 'neutral' | 'success' {
  switch ((statusCode ?? '').toUpperCase()) {
    case 'RENTING':
      return 'brand'
    case 'OVERDUE':
      return 'danger'
    case 'CAPPED':
      return 'warning'
    case 'LOST':
      return 'orange' as 'warning'
    case 'SETTLED':
      return 'success'
    default:
      return 'neutral'
  }
}
