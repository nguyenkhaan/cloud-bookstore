import type { ApprovalTabKey } from '../approvals.type'
import { normalizeRoleCode } from '@/features/auth/role'
import { canReadAccess, resolveEffectiveScreenAccess } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'
import type { ScreenId } from '@/routes/screen-access.policy'

interface ApprovalTabBarProps {
  activeTab: ApprovalTabKey
  counts: Record<ApprovalTabKey, number>
  onSelectTab: (tab: ApprovalTabKey) => void
  tabs: readonly ApprovalTabDefinition[]
}

export type ApprovalTabDefinition = {
  key: ApprovalTabKey
  label: string
  screenId: ScreenId
}

export const APPROVAL_TABS: readonly ApprovalTabDefinition[] = [
  { key: 'old-book-price', label: 'Thu mua vượt hạn mức', screenId: 'approvalsRequests' },
  { key: 'damage-penalty', label: 'Phạt hư hỏng', screenId: 'approvalsRequests' },
  { key: 'inventory-adjustment', label: 'Điều chỉnh kho', screenId: 'approvalsInventoryAdjustment' },
  { key: 'disposal-reversal', label: 'Xuất hủy / Đảo hóa đơn', screenId: 'approvalsRequests' },
]

export function getVisibleApprovalTabs(
  roleCode?: string | null,
  permissionCodes: ReadonlySet<string> = new Set<string>(),
  permissionStatus: 'loading' | 'ready' | 'error' = 'ready',
): readonly ApprovalTabDefinition[] {
  const role = normalizeRoleCode(roleCode) as AppRole | null
  return APPROVAL_TABS.filter((tab) => canReadAccess(
    resolveEffectiveScreenAccess(tab.screenId, role, permissionCodes, permissionStatus),
  ))
}

export function ApprovalTabBar({ activeTab, counts, onSelectTab, tabs }: ApprovalTabBarProps) {
  return (
    <nav aria-label="Các nhóm yêu cầu phê duyệt" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const pendingCount = counts[tab.key]

          return (
            <button
              key={tab.key}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
              onClick={() => onSelectTab(tab.key)}
              type="button"
            >
              {tab.label}
              {pendingCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
