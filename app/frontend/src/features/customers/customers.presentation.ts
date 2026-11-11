export type { CustomerExportFormat } from './customers.export'
export { exportCustomersToFile } from './customers.export'

export function normalizePhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone || !rawPhone.trim()) {
    return ''
  }

  let digits = rawPhone.replace(/\D/g, '')

  if (digits.startsWith('840') && digits.length === 12) {
    digits = '0' + digits.slice(3)
  } else if (digits.startsWith('84') && digits.length === 11) {
    digits = '0' + digits.slice(2)
  }

  return digits
}

export function isValidVietnamesePhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  return /^0[35789]\d{8}$/.test(phone)
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—'
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`
  }
  return phone
}

export function formatVnd(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0 đ'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '0 đ'
  return `${new Intl.NumberFormat('vi-VN').format(numeric)} đ`
}

export function getTierBadge(tierName: string | undefined): {
  label: string
  bg: string
  text: string
  border: string
} {
  const normalized = (tierName ?? 'REGULAR').toUpperCase()

  switch (normalized) {
    case 'GOLD':
      return {
        label: 'Vàng',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      }
    case 'SILVER':
      return {
        label: 'Bạc',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
      }
    case 'REGULAR':
    default:
      return {
        label: 'Thường',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
      }
  }
}

export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'KH'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function maskNationalId(nationalId: string | null | undefined, revealed = false): string {
  if (!nationalId || !nationalId.trim()) return '—'
  const trimmed = nationalId.trim()
  if (revealed) return trimmed
  if (trimmed.length <= 4) {
    return '•'.repeat(trimmed.length)
  }
  return `•••• •••• ${trimmed.slice(-4)}`
}

export function formatDateVi(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export type TierPolicy = {
  tierKey: 'REGULAR' | 'SILVER' | 'GOLD'
  label: string
  maxBooks: number
  maxRentalDays: number
  rentDiscountPct: number
  saleDiscountPct: number
  nextTierLabel: string | null
  nextTierThreshold: number | null
  remainingToNextTier: number
  progressPercent: number
}

export function getTierPolicy(tierName: string | undefined, eligibleSpend: number): TierPolicy {
  const normalized = (tierName ?? 'REGULAR').toUpperCase()
  const safeSpend = Math.max(0, Number.isFinite(eligibleSpend) ? eligibleSpend : 0)

  if (normalized === 'GOLD') {
    return {
      tierKey: 'GOLD',
      label: 'Vàng',
      maxBooks: 8,
      maxRentalDays: 30,
      rentDiscountPct: 10,
      saleDiscountPct: 10,
      nextTierLabel: null,
      nextTierThreshold: null,
      remainingToNextTier: 0,
      progressPercent: 100,
    }
  }

  if (normalized === 'SILVER') {
    const threshold = 3_000_000
    return {
      tierKey: 'SILVER',
      label: 'Bạc',
      maxBooks: 5,
      maxRentalDays: 21,
      rentDiscountPct: 5,
      saleDiscountPct: 5,
      nextTierLabel: 'Vàng',
      nextTierThreshold: threshold,
      remainingToNextTier: Math.max(0, threshold - safeSpend),
      progressPercent: Math.min(100, Math.round((safeSpend / threshold) * 100)),
    }
  }

  const threshold = 1_000_000
  return {
    tierKey: 'REGULAR',
    label: 'Thường',
    maxBooks: 3,
    maxRentalDays: 14,
    rentDiscountPct: 0,
    saleDiscountPct: 0,
    nextTierLabel: 'Bạc',
    nextTierThreshold: threshold,
    remainingToNextTier: Math.max(0, threshold - safeSpend),
    progressPercent: Math.min(100, Math.round((safeSpend / threshold) * 100)),
  }
}
