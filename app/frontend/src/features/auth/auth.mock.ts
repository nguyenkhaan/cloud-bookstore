import type { AuthUser } from '@/context/AuthProvider'
import type {
  MockLoginDevice,
  MockNotificationPrefs,
  MockProfileExtras,
} from './auth.type'

export const DEFAULT_SHIFT_OPTIONS = [
  { value: 'Ca sáng (07:30 - 15:30)', label: 'Ca sáng (07:30 - 15:30)' },
  { value: 'Ca chiều (15:00 - 22:00)', label: 'Ca chiều (15:00 - 22:00)' },
  { value: 'Hành chính (08:00 - 17:30)', label: 'Hành chính (08:00 - 17:30)' },
]

export const INITIAL_MOCK_DEVICES: MockLoginDevice[] = [
  {
    id: 'dev-win11',
    name: 'Chrome 129 · Windows 11',
    icon: 'desktop',
    isCurrent: true,
    lastActive: 'Hôm nay, 08:02 (Hiện tại)',
    status: 'active',
  },
  {
    id: 'dev-iphone15',
    name: 'Safari · iPhone 15',
    icon: 'mobile',
    isCurrent: false,
    lastActive: 'Hôm qua, 21:14',
    status: 'active',
  },
  {
    id: 'dev-edge-win10',
    name: 'Microsoft Edge · Windows 10',
    icon: 'laptop',
    isCurrent: false,
    lastActive: '12/10/2026, 14:30',
    status: 'logged_out',
  },
]

export const INITIAL_MOCK_NOTIFICATION_PREFS: MockNotificationPrefs = {
  systemSecurity: true,
  shiftAndPos: true,
  weeklyEmailDigest: false,
}

export function getRoleBadgeLabel(roleCode?: string, fallbackRole?: string): string {
  switch (roleCode) {
    case 'ADMIN':
      return 'Quản trị viên (Admin)'
    case 'CASHIER':
      return 'Nhân viên (Cashier)'
    case 'INVENTORY_MANAGER':
      return 'Quản lý kho (Warehouse)'
    default:
      return fallbackRole ? `${fallbackRole}` : 'Nhân viên nội bộ'
  }
}

export function getRolePermissionLabel(roleCode?: string, fallbackRole?: string): string {
  switch (roleCode) {
    case 'ADMIN':
      return 'Quản trị viên (Toàn quyền)'
    case 'CASHIER':
      return 'Nhân viên bán hàng (Quầy giao dịch)'
    case 'INVENTORY_MANAGER':
      return 'Quản lý kho (Kho & đầu sách)'
    default:
      return fallbackRole || 'Nhân viên nội bộ'
  }
}

export function getMockProfileForUser(user?: AuthUser): MockProfileExtras {
  const emailLocalPart = user?.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const prefix =
    user?.roleCode === 'ADMIN'
      ? 'admin'
      : user?.roleCode === 'INVENTORY_MANAGER'
        ? 'kho'
        : 'nv'

  return {
    username: emailLocalPart ? `${prefix}_${emailLocalPart}` : 'admin_minhanh',
    employeeCode:
      user?.roleCode === 'ADMIN'
        ? 'NV-001'
        : user?.roleCode === 'INVENTORY_MANAGER'
          ? 'NV-012'
          : 'NV-024',
    branch: 'Nhà Sách Mây · Thủ Đức',
    joinedAt: '15/01/2024',
    phone: '0903 123 456',
    defaultShift: 'Ca sáng (07:30 - 15:30)',
    lastPasswordChangedLabel: '02/10/2026 (45 ngày trước)',
  }
}
