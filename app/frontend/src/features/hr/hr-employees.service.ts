import axios from 'axios'
import { privateClient } from '@/api/client'
import { createInitialHrEmployees } from './hr-employees.mock'
import type {
  ChangeEmployeeRolePayload,
  ChangeRoleResult,
  CreateHrEmployeeInput,
  HrEmployee,
  HrEmployeeKpiSummary,
  HrEmployeeListQuery,
  HrEmployeeListResult,
  UpdateHrEmployeeInput,
  UpdateHrEmployeeResult,
} from './hr-employees.type'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let employeeStore: HrEmployee[] = createInitialHrEmployees()

export function resetHrEmployeesStore(): void {
  employeeStore = createInitialHrEmployees()
}

function computeKpiSummary(list: HrEmployee[]): HrEmployeeKpiSummary {
  return {
    activeCount: list.filter(
      (item) => item.status === 'active' || item.status === 'in_shift',
    ).length,
    newAccountsCount: list.filter((item) => item.status === 'pending_activation')
      .length,
    inShiftCount: list.filter((item) => item.status === 'in_shift').length,
    rootAdminCount: list.filter((item) => item.isRootAdmin).length,
  }
}

function deriveUsername(email: string): string {
  const localPart = email.split('@')[0]?.trim()
  return localPart || 'staff'
}

function formatTodayDdMmYyyy(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

function nextEmployeeCode(list: HrEmployee[]): string {
  const maxNumber = list.reduce((max, item) => {
    const match = /^NV-(\d+)$/i.exec(item.code)
    const value = match ? Number.parseInt(match[1], 10) : 0
    return Number.isFinite(value) && value > max ? value : max
  }, 0)
  return `NV-${String(maxNumber + 1).padStart(4, '0')}`
}

function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string } | undefined
    if (data?.message) return data.message
    if (data?.detail) return data.detail
    if (error.response?.status === 403) {
      return 'Bạn không có quyền thay đổi vai trò nhân viên.'
    }
    if (error.response?.status === 404) {
      return 'Không tìm thấy nhân viên trên hệ thống.'
    }
  }
  return error instanceof Error ? error.message : 'Không thể cập nhật vai trò nhân viên.'
}

export async function changeEmployeeRole(
  employeeId: string,
  payload: ChangeEmployeeRolePayload,
): Promise<ChangeRoleResult> {
  const existing = employeeStore.find(
    (item) =>
      item.id === employeeId ||
      item.backendId === employeeId ||
      item.code.toLowerCase() === employeeId.toLowerCase(),
  )
  const previousRole = existing?.roleCode ?? 'CASHIER'
  const targetId = existing?.backendId ?? employeeId

  if (UUID_REGEX.test(targetId)) {
    try {
      await privateClient.patch(
        `/employee/${encodeURIComponent(targetId)}/role`,
        payload,
      )
      return {
        employeeId: targetId,
        previousRole,
        currentRole: payload.roleName,
        changedAt: new Date().toISOString(),
        source: 'api',
      }
    } catch (error) {
      // Fall back to mock state only when backend is unreachable or proxy returns 502+;
      // real 4xx domain/RBAC errors from a live server must be surfaced.
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status < 502
      ) {
        throw new Error(extractApiErrorMessage(error))
      }
    }
  }

  return {
    employeeId: targetId,
    previousRole,
    currentRole: payload.roleName,
    changedAt: new Date().toISOString(),
    source: 'mock-fallback',
  }
}

export async function listHrEmployees(
  query: HrEmployeeListQuery = {},
): Promise<HrEmployeeListResult> {
  const pageSize = query.pageSize ?? 6
  const requestedPage = Math.max(1, query.page ?? 1)
  const searchTerm = query.search?.trim().toLowerCase() ?? ''

  const filtered = employeeStore.filter((employee) => {
    if (searchTerm) {
      const haystack = `${employee.fullName} ${employee.code} ${employee.email} ${employee.phone}`.toLowerCase()
      if (!haystack.includes(searchTerm)) return false
    }
    if (query.roleCode && employee.roleCode !== query.roleCode) return false
    if (query.status && employee.status !== query.status) return false
    return true
  })

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const startIndex = (page - 1) * pageSize
  const items = filtered.slice(startIndex, startIndex + pageSize)

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    kpi: computeKpiSummary(employeeStore),
  }
}

export async function getHrEmployeeById(id: string): Promise<HrEmployee | null> {
  const normalized = id.trim().toLowerCase()
  const found = employeeStore.find(
    (item) =>
      item.id.toLowerCase() === normalized ||
      item.code.toLowerCase() === normalized ||
      item.backendId?.toLowerCase() === normalized,
  )
  return found ?? null
}

export async function createHrEmployee(
  input: CreateHrEmployeeInput,
): Promise<HrEmployee> {
  const normalizedEmail = input.email.trim().toLowerCase()
  const duplicateEmail = employeeStore.some(
    (item) => item.email.toLowerCase() === normalizedEmail,
  )
  if (duplicateEmail) {
    throw new Error('Email đăng nhập đã tồn tại trong hệ thống.')
  }

  const code = nextEmployeeCode(employeeStore)
  const created: HrEmployee = {
    id: code,
    code,
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    roleCode: input.roleCode,
    jobTitle: input.jobTitle?.trim() || undefined,
    status: 'pending_activation',
    branchName: 'Nhà sách Mây · Cơ sở 01',
    createdAt: formatTodayDdMmYyyy(),
    username: deriveUsername(normalizedEmail),
    recentShifts: [],
  }

  employeeStore = [...employeeStore, created]
  return created
}

export async function updateHrEmployee(
  input: UpdateHrEmployeeInput,
): Promise<UpdateHrEmployeeResult> {
  const index = employeeStore.findIndex(
    (item) =>
      item.id.toLowerCase() === input.id.toLowerCase() ||
      item.code.toLowerCase() === input.id.toLowerCase(),
  )
  if (index < 0) {
    throw new Error('Không tìm thấy nhân viên cần cập nhật.')
  }

  const current = employeeStore[index]
  const roleChanged = current.roleCode !== input.roleCode

  if (current.isRootAdmin) {
    if (roleChanged || input.status !== current.status) {
      throw new Error(
        'RootAdmin không thể bị khóa, xóa hoặc hạ quyền. Đây là tài khoản khôi phục quyền quản trị cao nhất của cửa hàng.',
      )
    }
  }

  let roleChangeSource: 'api' | 'mock-fallback' | undefined
  if (roleChanged) {
    const reason = input.roleChangeReason?.trim() ?? ''
    if (!reason) {
      throw new Error('Vui lòng nhập lý do đổi vai trò.')
    }
    const roleResult = await changeEmployeeRole(current.backendId ?? current.id, {
      roleName: input.roleCode,
      reason,
    })
    roleChangeSource = roleResult.source
  }

  const updated: HrEmployee = {
    ...current,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    roleCode: input.roleCode,
    jobTitle: input.jobTitle?.trim() || undefined,
    status: input.status,
  }

  employeeStore = employeeStore.map((item, idx) => (idx === index ? updated : item))
  return {
    employee: updated,
    roleChanged,
    roleChangeSource,
  }
}
