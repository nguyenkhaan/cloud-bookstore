import type {
  BackendRoleName,
  HrEmployeeStatus,
} from './hr-employees.type'

export const HR_EMPLOYEE_STATUS_LABELS: Record<HrEmployeeStatus, string> = {
  active: 'Đang hoạt động',
  in_shift: 'Đang trong ca',
  pending_activation: 'Chờ kích hoạt',
  locked: 'Đã khóa',
  revoked: 'Đã thu hồi',
}

export const HR_EMPLOYEE_ROLE_OPTIONS: { value: BackendRoleName; label: string }[] = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'CASHIER', label: 'Thu ngân' },
  { value: 'INVENTORY_MANAGER', label: 'Quản lý kho' },
]

export const HR_EMPLOYEE_STATUS_OPTIONS: { value: HrEmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
  { value: 'pending_activation', label: 'Chờ kích hoạt' },
  { value: 'revoked', label: 'Đã thu hồi' },
]
