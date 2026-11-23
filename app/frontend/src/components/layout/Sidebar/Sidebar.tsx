import React, { useContext, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import {
  DashboardIcon,
  InventoryIcon,
  WarehouseIcon,
  HeadphonesIcon,
  PanelToggleIcon,
  ExternalLinkIcon,
  LogoutIcon,
  PosIcon,
  CustomerIcon, 
  StaffIcon, 
  ApprovalIcon,
  AuditIcon, 
  ReportIcon, 
  SettingsIcon,
  ChevronDownIcon,
} from '@/components/common/Icons';
import { Logo } from '@/components/common/Logo';
import { AuthContext } from '@/context/AuthProvider';
import { brand } from '@/lib/brand';
import { hrPaths } from '@/features/hr/hr.route';
import { normalizeRoleCode } from '@/features/auth/role';
import { usePermissions } from '@/hooks/usePermissions';
import {
  canReadAccess,
  resolveEffectiveScreenAccess,
} from '@/routes/screen-access.policy';
import type { AppRole } from '@/features/auth/role';
import type { AccessLevel, ScreenId } from '@/routes/screen-access.policy';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  screenId: ScreenId;
  childScreenIds?: readonly ScreenId[];
}

export interface SidebarProps {
  currentPath?: string;
  activeHref?: string;
  userRoleCode?: string;
  onNavigate?: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
  storeName?: string;
  branchName?: string;
  storeAddress?: string;
  userRole?: string;
}

const HR_SUB_NAV_ITEMS = [
  { id: 'hr-employees', label: 'Danh sách nhân viên', href: hrPaths.employees, screenId: 'hrEmployees' },
  { id: 'hr-shifts', label: 'Phân công ca', href: hrPaths.shifts, screenId: 'hrShifts' },
  { id: 'hr-attendance', label: 'Chấm công & Lương ca', href: hrPaths.attendance, screenId: 'hrAttendance' },
  { id: 'hr-requests', label: 'Đơn xét duyệt', href: hrPaths.requests, screenId: 'hrRequests' },
  { id: 'hr-payroll', label: 'Bảng lương', href: hrPaths.payroll, screenId: 'hrPayroll' },
  { id: 'hr-payslip', label: 'Phiếu lương', href: hrPaths.payslip, screenId: 'hrPayslip' },
] as const;

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: DashboardIcon, screenId: 'dashboard' },
  { id: 'pos', label: 'Quầy giao dịch', icon: PosIcon, screenId: 'pos' },
  {
    id: 'inventory',
    label: 'Quản lý sách',
    icon: InventoryIcon,
    screenId: 'catalogSeries',
    childScreenIds: ['catalogCategories', 'catalogSeries', 'catalogTitles'],
  },
  {
    id: 'warehouse',
    label: 'NCC & Kho',
    icon: WarehouseIcon,
    screenId: 'suppliers',
    childScreenIds: ['suppliers', 'stockReceipts', 'stockOut', 'inventoryCheck', 'stockAlerts'],
  },
  { id: 'customers', label: 'Khách hàng', icon: CustomerIcon, screenId: 'customers' },
  { id: 'hr', label: 'Nhân sự & tiền lương', icon: StaffIcon, screenId: 'hr' },
  { id: 'approvals', label: 'Phê duyệt', icon: ApprovalIcon, screenId: 'approvals' },
  { id: 'audit', label: 'Nhật ký kiểm toán', icon: AuditIcon, screenId: 'audit' },
  { id: 'reports', label: 'Báo cáo & thuế', icon: ReportIcon, screenId: 'reports' },
  { id: 'settings', label: 'Cấu hình hệ thống', icon: SettingsIcon, screenId: 'settings' },
];

function getRole(roleCode?: string | null): AppRole | null {
  return normalizeRoleCode(roleCode) as AppRole | null;
}

function getItemScreenIds(item: NavItem): readonly ScreenId[] {
  return item.childScreenIds ?? [item.screenId];
}

function resolveAccess(
  screenId: ScreenId,
  role: AppRole | null,
  permissionCodes: ReadonlySet<string>,
  permissionStatus: 'loading' | 'ready' | 'error',
): AccessLevel {
  return resolveEffectiveScreenAccess(screenId, role, permissionCodes, permissionStatus);
}

function hasReadableScreen(
  screenIds: readonly ScreenId[],
  role: AppRole | null,
  permissionCodes = new Set<string>(),
  permissionStatus: 'loading' | 'ready' | 'error' = 'ready',
): boolean {
  return role !== null && screenIds.some((screenId) =>
    canReadAccess(resolveAccess(screenId, role, permissionCodes, permissionStatus)),
  );
}

export function canAccessNavItem(id: string, roleCode?: string): boolean {
  const role = getRole(roleCode);
  const item = DEFAULT_NAV_ITEMS.find((candidate) => candidate.id === id);
  return item ? hasReadableScreen(getItemScreenIds(item), role) : false;
}

export function visibleNavItemIdsFor(roleCode?: string): string[] {
  const role = getRole(roleCode);
  return DEFAULT_NAV_ITEMS
    .filter((item) => hasReadableScreen(getItemScreenIds(item), role))
    .map((item) => item.id);
}

export function visibleHrSubNavItemIdsFor(roleCode?: string): string[] {
  const role = getRole(roleCode);
  return HR_SUB_NAV_ITEMS
    .filter((item) => hasReadableScreen([item.screenId], role))
    .map((item) => item.id);
}

export function navLabelFor(id: string): string {
  const labels: Record<string, string> = {
    overview: 'Tổng quan',
    inventory: 'Quản lý sách',
    warehouse: 'NCC & Kho',
    pos: 'Quầy giao dịch',
    customers: 'Khách hàng',
    hr: 'Nhân sự & tiền lương',
    approvals: 'Phê duyệt',
    audit: 'Nhật ký kiểm toán',
    reports: 'Báo cáo & thuế',
    settings: 'Cấu hình hệ thống',
  };
  return labels[id] ?? 'Hệ thống';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = 'overview',
  activeHref = '',
  userRoleCode,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  onSignOut,
  storeName = brand.storeName,
  storeAddress = brand.address,
  userRole,
}) => {
  const auth = useContext(AuthContext);
  const inRouterContext = useInRouterContext();
  const effectiveRole = userRoleCode ?? userRole ?? auth?.session?.user?.roleCode;
  const role = getRole(effectiveRole);
  const permissions = usePermissions();
  const permissionStatus = permissions.isError
    ? 'error'
    : permissions.isPending
      ? 'loading'
      : 'ready';
  const [isHrExpanded, setIsHrExpanded] = useState(
    currentPath === 'hr' || activeHref.startsWith('/hr'),
  );

  const visibleNavItems = DEFAULT_NAV_ITEMS.filter(
    (item) => hasReadableScreen(
      getItemScreenIds(item),
      role,
      permissions.permissionCodes,
      permissionStatus,
    ),
  );

  const handleSignOut = () => {
    onSignOut?.();
  };
  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen sticky top-0`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
        <div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <Logo variant={isCollapsed ? 'mark' : 'full'} />
        </div>

        {!isCollapsed ? (
          <div className="mb-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5 px-3 transition-colors">
            <div className="text-xs font-semibold text-slate-800">
              {storeName}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">{storeAddress}</div>
          </div>
        ) : (
          <div className="my-2 h-px bg-slate-200" />
        )}

        {!isCollapsed ? (
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Không gian làm việc
          </div>
        ) : (
          <div className="h-2" />
        )}

        <nav aria-label="Điều hướng chính" className="space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = currentPath === item.id;
            const Icon = item.icon;
            const isHrGroup = item.id === 'hr';

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  aria-expanded={isHrGroup && !isCollapsed ? isHrExpanded : undefined}
                  onClick={() => {
                    if (isHrGroup && !isCollapsed) {
                      setIsHrExpanded((prev) => !prev);
                      if (currentPath !== 'hr') {
                        onNavigate?.(item.id);
                      }
                      return;
                    }
                    onNavigate?.(item.id);
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`group flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center transition-colors ${
                        isActive ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-800'
                      }`}
                    >
                      <Icon size={19} />
                    </div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {isHrGroup && !isCollapsed && (
                    <ChevronDownIcon
                      size={14}
                      className={`transition-transform duration-200 ${
                        isHrExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {isHrGroup && !isCollapsed && isHrExpanded && (
                  <div className="ml-4 space-y-0.5 border-l border-slate-200 pl-3" data-testid="sidebar-hr-submenu">
                    {HR_SUB_NAV_ITEMS.filter((sub) => hasReadableScreen(
                      [sub.screenId],
                      role,
                      permissions.permissionCodes,
                      permissionStatus,
                    )).map((sub) => {
                      const isSubActive =
                        activeHref === sub.href ||
                        activeHref.startsWith(`${sub.href}/`);
                      const itemClass = `flex min-h-[36px] w-full items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        isSubActive
                          ? 'bg-indigo-50/90 font-semibold text-indigo-700'
                          : 'font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                      }`;

                      if (inRouterContext) {
                        return (
                          <Link
                            key={sub.id}
                            aria-current={isSubActive ? 'page' : undefined}
                            className={itemClass}
                            to={sub.href}
                          >
                            {sub.label}
                          </Link>
                        );
                      }

                      return (
                        <a
                          key={sub.id}
                          aria-current={isSubActive ? 'page' : undefined}
                          className={itemClass}
                          href={sub.href}
                        >
                          {sub.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        {!isCollapsed && (
          <div className="mb-3 rounded-2xl border border-indigo-100/80 bg-linear-to-b from-indigo-50/60 to-indigo-50/20 p-3.5 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <HeadphonesIcon size={15} />
              </div>
              <div>
                <a
                  href="mailto:bookstore@gmail.com"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  <span>Liên hệ trợ giúp</span>
                  <ExternalLinkIcon size={11} />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title={isCollapsed ? 'Đăng xuất' : undefined}
          >
            <LogoutIcon size={17} />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <PanelToggleIcon size={17} className={isCollapsed ? 'rotate-180' : ''} />
            {!isCollapsed && <span>Thu gọn thanh bên</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
