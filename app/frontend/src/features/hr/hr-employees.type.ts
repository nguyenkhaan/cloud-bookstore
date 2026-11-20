import type { components } from '@/contract/api-contract'

export type BackendRoleName = components['schemas']['RoleName']
export type ChangeEmployeeRolePayload = components['schemas']['ChangeEmployeeRequest']

export type HrEmployeeStatus =
  | 'active'
  | 'in_shift'
  | 'pending_activation'
  | 'locked'

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
  status: HrEmployeeStatus
  branchName: string
  createdAt: string
  username: string
  isRootAdmin?: boolean
  backendId?: string
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

export interface CreateHrEmployeeInput {
  fullName: string
  email: string
  phone: string
  roleCode: BackendRoleName
  jobTitle?: string
}

export interface UpdateHrEmployeeInput {
  id: string
  fullName: string
  email: string
  phone: string
  roleCode: BackendRoleName
  jobTitle?: string
  status: HrEmployeeStatus
  roleChangeReason?: string
}

export interface ChangeRoleResult {
  employeeId: string
  previousRole: BackendRoleName
  currentRole: BackendRoleName
  changedAt: string
  source: 'api' | 'mock-fallback'
}

export interface UpdateHrEmployeeResult {
  employee: HrEmployee
  roleChanged: boolean
  roleChangeSource?: 'api' | 'mock-fallback'
}
