import type { components } from '@/contract/api-contract'

export type BackendRoleName = components['schemas']['RoleName']
export type BackendEmployeeStatus = components['schemas']['EmployeeStatus']
export type ChangeEmployeeRolePayload = components['schemas']['ChangeEmployeeRequest']
export type CreateEmployeeRequest = components['schemas']['CreateEmployeeRequest']
export type UpdateEmployeeRequest = components['schemas']['UpdateEmployeeRequest']

/** UI-facing employee status, mapped from the backend `EmployeeStatus` enum. */
export type HrEmployeeStatus =
  | 'active'
  | 'in_shift'
  | 'pending_activation'
  | 'locked'
  | 'revoked'

export type HrEmployeeShiftStatus = 'completed' | 'missing_attendance'

export interface HrEmployeeShiftRecord {
  id: string
  workDate: string
  shiftOrder: string
  timeRange: string
  checkInOut: string
  status: HrEmployeeShiftStatus
}

export interface HrEmployee {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  roleCode: BackendRoleName
  jobTitle?: string
  hourlyRate: number
  bankName?: string
  bankAccountNumber?: string
  status: HrEmployeeStatus
  branchName: string
  createdAt: string
  username: string
  isRootAdmin: boolean
  recentShifts: HrEmployeeShiftRecord[]
}

export interface HrEmployeeListQuery {
  search?: string
  roleCode?: BackendRoleName | ''
  status?: HrEmployeeStatus | ''
  page?: number
  pageSize?: number
}

export interface HrEmployeeKpiSummary {
  activeCount: number
  newAccountsCount: number
  inShiftCount: number
  rootAdminCount: number
}

export interface HrEmployeeListResult {
  items: HrEmployee[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  kpi: HrEmployeeKpiSummary
}

export interface HrEmployeeShiftListResult {
  items: HrEmployeeShiftRecord[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateHrEmployeeInput {
  fullName: string
  email: string
  phone: string
  roleCode: BackendRoleName
  jobTitle?: string
  hourlyRate?: number
  bankName?: string
  bankAccountNumber?: string
}

export interface UpdateHrEmployeeInput {
  id: string
  fullName: string
  email: string
  phone: string
  roleCode: BackendRoleName
  jobTitle?: string
  hourlyRate?: number
  bankName?: string
  bankAccountNumber?: string
  status: HrEmployeeStatus
  roleChangeReason?: string
}

export interface ChangeRoleResult {
  employeeId: string
  previousRole: BackendRoleName
  currentRole: BackendRoleName
  changedAt: string
  source: 'api'
}

export interface UpdateHrEmployeeResult {
  employee: HrEmployee
  roleChanged: boolean
  roleChangeSource?: 'api'
}
