import axios from 'axios'
import { privateClient } from '@/api/client'
import type { components } from '@/contract/api-contract'
import type {
  BackendEmployeeStatus,
  ChangeEmployeeRolePayload,
  ChangeRoleResult,
  CreateHrEmployeeInput,
  HrEmployee,
  HrEmployeeListQuery,
  HrEmployeeListResult,
  HrEmployeeShiftListResult,
  HrEmployeeShiftRecord,
  HrEmployeeShiftStatus,
  HrEmployeeStatus,
  UpdateHrEmployeeInput,
  UpdateHrEmployeeResult,
} from './hr-employees.type'

type EmployeeDto = components['schemas']['EmployeeDto']
type EmployeeListResultDto = components['schemas']['EmployeeListResultDto']
type EmployeeShiftDto = components['schemas']['EmployeeShiftDto']
type EmployeeShiftListDto = components['schemas']['EmployeeShiftListDto']
type EmployeeRoleResponseDto = components['schemas']['EmployeeRoleResponse']

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_FROM_API: Record<BackendEmployeeStatus, HrEmployeeStatus> = {
  ACTIVE: 'active',
  INVITED: 'pending_activation',
  PENDING_OTP: 'pending_activation',
  LOCKED: 'locked',
  REVOKED: 'revoked',
}

function statusToApi(status: HrEmployeeStatus): BackendEmployeeStatus {
  switch (status) {
    case 'active':
    case 'in_shift':
      return 'ACTIVE'
    case 'pending_activation':
      return 'INVITED'
    case 'locked':
      return 'LOCKED'
    case 'revoked':
      return 'REVOKED'
  }
}

function deriveUsername(email: string): string {
  const localPart = email.split('@')[0]?.trim()
  return localPart || 'staff'
}

function timeRangeLabel(shift: EmployeeShiftDto): string {
  if (!shift.checkInAt || !shift.checkOutAt) return 'Chưa đủ chấm công'
  const start = shift.checkInAt.slice(11, 16)
  const end = shift.checkOutAt.slice(11, 16)
  return `${start}–${end}`
}

function mapShift(shift: EmployeeShiftDto): HrEmployeeShiftRecord {
  const status: HrEmployeeShiftStatus =
    shift.checkInAt && shift.checkOutAt ? 'completed' : 'missing_attendance'
  return {
    id: shift.id,
    workDate: shift.workDate.split('-').reverse().join('/'),
    shiftOrder: `Ca ${shift.shiftNo}`,
    timeRange: timeRangeLabel(shift),
    checkInOut: `${shift.checkInAt?.slice(11, 16) ?? '--:--'} / ${shift.checkOutAt?.slice(11, 16) ?? '--:--'}`,
    status,
  }
}

export function mapEmployee(dto: EmployeeDto): HrEmployee {
  return {
    id: dto.id,
    code: dto.employeeCode,
    fullName: dto.fullName,
    email: dto.email,
    phone: dto.phone,
    roleCode: dto.roleName,
    jobTitle: dto.jobTitle ?? undefined,
    status: STATUS_FROM_API[dto.status],
    branchName: dto.branchName ?? 'Nhà sách Mây · Cơ sở 01',
    createdAt: dto.createdAt,
    username: deriveUsername(dto.email),
    isRootAdmin: dto.isProtected,
    recentShifts: [],
  }
}

export function extractHrApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; detail?: string; title?: string }
      | undefined
    if (data?.message) return data.message
    if (data?.detail) return data.detail
    if (error.response?.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }
    if (error.response?.status === 404) {
      return 'Không tìm thấy nhân viên trên hệ thống.'
    }
    if (error.response?.status === 409) {
      return data?.title ?? 'Dữ liệu nhân viên bị trùng hoặc đã thay đổi.'
    }
  }
  return error instanceof Error && error.message ? error.message : fallback
}

export async function listHrEmployees(
  query: HrEmployeeListQuery = {},
): Promise<HrEmployeeListResult> {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = query.pageSize ?? 6
  const response = await privateClient.get<EmployeeListResultDto>('/employees', {
    params: {
      search: query.search?.trim() || undefined,
      roleName: query.roleCode || undefined,
      status: query.status ? statusToApi(query.status) : undefined,
      page,
      pageSize,
    },
  })
  const data = response.data
  return {
    items: data.items.map(mapEmployee),
    totalCount: data.totalCount,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages,
    kpi: {
      activeCount: data.kpi.activeCount,
      newAccountsCount: data.kpi.newAccountsCount,
      inShiftCount: data.kpi.inShiftCount,
      rootAdminCount: data.kpi.rootAdminCount,
    },
  }
}

export async function getHrEmployeeById(id: string): Promise<HrEmployee | null> {
  if (!id.trim()) return null
  try {
    const response = await privateClient.get<EmployeeDto>(
      `/employees/${encodeURIComponent(id)}`,
    )
    return mapEmployee(response.data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw new Error(extractHrApiErrorMessage(error, 'Không thể tải hồ sơ nhân viên.'))
  }
}

export async function getHrEmployeeShifts(
  employeeId: string,
  page = 1,
  pageSize = 5,
): Promise<HrEmployeeShiftListResult> {
  const response = await privateClient.get<EmployeeShiftListDto>(
    `/employees/${encodeURIComponent(employeeId)}/shifts`,
    { params: { page, pageSize } },
  )
  return {
    items: response.data.items.map(mapShift),
    totalCount: response.data.totalCount,
    page: response.data.page,
    pageSize: response.data.pageSize,
    totalPages: response.data.totalPages,
  }
}

export async function createHrEmployee(
  input: CreateHrEmployeeInput,
): Promise<HrEmployee> {
  try {
    const response = await privateClient.post<EmployeeDto>('/employees', {
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      roleName: input.roleCode,
      jobTitle: input.jobTitle?.trim() || undefined,
    })
    return mapEmployee(response.data)
  } catch (error) {
    throw new Error(
      extractHrApiErrorMessage(error, 'Không thể tạo tài khoản nhân viên.'),
    )
  }
}

export async function changeEmployeeRole(
  employeeId: string,
  payload: ChangeEmployeeRolePayload,
): Promise<ChangeRoleResult> {
  if (!payload.reason.trim()) {
    throw new Error('Vui lòng nhập lý do đổi vai trò.')
  }
  if (!UUID_REGEX.test(employeeId)) {
    throw new Error('Mã nhân viên không hợp lệ để cập nhật vai trò.')
  }
  try {
    const response = await privateClient.patch<EmployeeRoleResponseDto>(
      `/employee/${encodeURIComponent(employeeId)}/role`,
      { roleName: payload.roleName, reason: payload.reason.trim() },
    )
    return {
      employeeId: response.data.employeeId,
      previousRole: response.data.previousRole,
      currentRole: response.data.currentRole,
      changedAt: response.data.changedAt,
      source: 'api',
    }
  } catch (error) {
    throw new Error(
      extractHrApiErrorMessage(error, 'Không thể cập nhật vai trò nhân viên.'),
    )
  }
}

export async function updateHrEmployee(
  input: UpdateHrEmployeeInput,
): Promise<UpdateHrEmployeeResult> {
  try {
    const response = await privateClient.put<EmployeeDto>(
      `/employees/${encodeURIComponent(input.id)}`,
      {
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        jobTitle: input.jobTitle?.trim() || null,
        status: statusToApi(input.status),
        reason: input.roleChangeReason?.trim() || undefined,
      },
    )
    let employee = mapEmployee(response.data)
    let roleChanged = false
    if (employee.roleCode !== input.roleCode) {
      const reason = input.roleChangeReason?.trim()
      if (!reason) {
        throw new Error('Vui lòng nhập lý do đổi vai trò.')
      }
      const roleResult = await changeEmployeeRole(input.id, {
        roleName: input.roleCode,
        reason,
      })
      roleChanged = true
      employee = { ...employee, roleCode: roleResult.currentRole }
    }
    return roleChanged
      ? { employee, roleChanged, roleChangeSource: 'api' }
      : { employee, roleChanged }
  } catch (error) {
    throw new Error(
      extractHrApiErrorMessage(error, 'Không thể cập nhật hồ sơ nhân viên.'),
    )
  }
}

export async function resendHrEmployeeSetupEmail(employeeId: string): Promise<void> {
  try {
    await privateClient.post(
      `/employees/${encodeURIComponent(employeeId)}/resend-setup-email`,
    )
  } catch (error) {
    throw new Error(
      extractHrApiErrorMessage(error, 'Không thể gửi lại email kích hoạt.'),
    )
  }
}
