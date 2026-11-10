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
