import React from 'react'
import type { SystemTabKey } from '../settings.type'
import { normalizeRoleCode } from '@/features/auth/role'
import { canReadAccess, resolveEffectiveScreenAccess } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'
import type { ScreenId } from '@/routes/screen-access.policy'

interface SettingsTabBarProps {
  activeTab: SystemTabKey
  onSelectTab: (tab: SystemTabKey) => void
  tabs: readonly SettingsTabDefinition[]
}

export interface SettingsTabDefinition {
  key: SystemTabKey
  label: string
  screenId: ScreenId
}

export const SETTINGS_TABS: readonly SettingsTabDefinition[] = [
  { key: 'rental', label: 'Tham số thuê, trả & khung phạt', screenId: 'settingsRental' },
  { key: 'tiers', label: 'Hạng thành viên & chiết khấu', screenId: 'settingsTiers' },
  { key: 'rbac', label: 'Ma trận phân quyền', screenId: 'settingsRbac' },
  { key: 'integrations', label: 'Tích hợp', screenId: 'settingsIntegrations' },
]

export function getVisibleSettingsTabs(
  roleCode?: string | null,
  permissionCodes: ReadonlySet<string> = new Set<string>(),
  permissionStatus: 'loading' | 'ready' | 'error' = 'ready',
): readonly SettingsTabDefinition[] {
  const role = normalizeRoleCode(roleCode) as AppRole | null
  return SETTINGS_TABS.filter((tab) => canReadAccess(
    resolveEffectiveScreenAccess(tab.screenId, role, permissionCodes, permissionStatus),
  ))
}

export const SettingsTabBar: React.FC<SettingsTabBarProps> = ({ activeTab, onSelectTab, tabs }) => {
  return (
    <nav aria-label="Các mục cấu hình hệ thống" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px min-h-11 border-b-2 px-1 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
