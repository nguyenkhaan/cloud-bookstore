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

export function formatMillions(amount: number | string | null | undefined): string {
  const safe = toNumber(amount)
  const m = safe / 1_000_000
  return m.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(value: number | string | null | undefined): string {
  const safe = toNumber(value)
  return `${safe.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
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

export function getTodayVnDateInput(): string {
  const now = new Date()
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const y = vn.getUTCFullYear()
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const d = String(vn.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
