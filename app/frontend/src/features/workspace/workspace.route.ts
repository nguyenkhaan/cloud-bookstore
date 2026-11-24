import type { ComponentType } from 'react'
import { catalogPaths } from '@/features/catalog/catalog.route'
import { normalizeRoleCode } from '@/features/auth/role'
import {
  ApprovalIcon,
  AuditIcon,
  CustomerIcon,
  DashboardIcon,
  InventoryIcon,
  PosIcon,
  ReportIcon,
  SettingsIcon,
  StaffIcon,
  WarehouseIcon,
} from '@/components/common/Icons'
import { canReadAccess, getEffectiveAccess } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'
import type { ScreenId } from '@/routes/screen-access.policy'

export const workspacePaths = {
  overview: '/dashboard',
  pos: '/pos',
  inventory: catalogPaths.seriesList,
  warehouse: catalogPaths.suppliers,
  customers: '/customers',
  hr: '/hr',
  approvals: '/approvals',
  audit: '/audit',
  reports: '/reports',
  settings: '/settings',
} as const

export type WorkspaceItem = keyof typeof workspacePaths

export type WorkspaceNavItem = {
  id: WorkspaceItem
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export const workspaceNavItems: readonly WorkspaceNavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: DashboardIcon },
  { id: 'pos', label: 'Quầy giao dịch', icon: PosIcon },
  { id: 'inventory', label: 'Quản lý sách', icon: InventoryIcon },
  { id: 'warehouse', label: 'NCC & Kho', icon: WarehouseIcon },
  { id: 'customers', label: 'Khách hàng', icon: CustomerIcon },
  { id: 'hr', label: 'Nhân sự & tiền lương', icon: StaffIcon },
  { id: 'approvals', label: 'Phê duyệt', icon: ApprovalIcon },
  { id: 'audit', label: 'Nhật ký kiểm toán', icon: AuditIcon },
  { id: 'reports', label: 'Báo cáo & thuế', icon: ReportIcon },
  { id: 'settings', label: 'Cấu hình hệ thống', icon: SettingsIcon },
]

export const workspaceScreenIds: Record<WorkspaceItem, readonly ScreenId[]> = {
  overview: ['dashboard'],
  pos: ['pos'],
  inventory: ['catalogCategories', 'catalogSeries', 'catalogTitles'],
  warehouse: ['suppliers', 'stockReceipts', 'stockOut', 'inventoryCheck', 'stockAlerts'],
  customers: ['customers'],
  hr: ['hr'],
  approvals: ['approvals'],
  audit: ['audit'],
  reports: ['reports'],
  settings: ['settings'],
}

export function workspacePathFor(item: string, roleCode?: string | null): string | undefined {
  if (!Object.hasOwn(workspacePaths, item)) return undefined

  const workspaceItem = item as WorkspaceItem
  const path = workspacePaths[workspaceItem]
  if (!path || roleCode === undefined || roleCode === null) return path

  const role = normalizeRoleCode(roleCode) as AppRole | null
  if (!role) return undefined

  const readable = workspaceScreenIds[workspaceItem].some((screenId) =>
    canReadAccess(getEffectiveAccess(screenId, role)),
  )
  return readable ? path : undefined
}

const preferredWorkspaces: readonly WorkspaceItem[] = ['overview', 'pos', 'customers', 'hr', 'settings']

export function getFirstAllowedWorkspacePath(role: AppRole): string {
  const allowedWorkspace = preferredWorkspaces.find((workspace) =>
    workspaceScreenIds[workspace].some((screenId) => canReadAccess(getEffectiveAccess(screenId, role))),
  )
  return allowedWorkspace ? workspacePaths[allowedWorkspace] : '/login'
}
