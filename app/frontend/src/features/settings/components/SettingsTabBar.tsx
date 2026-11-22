import React from 'react'
import type { SystemTabKey } from '../settings.type'

interface SettingsTabBarProps {
  activeTab: SystemTabKey
  onSelectTab: (tab: SystemTabKey) => void
  isAdmin: boolean
}

interface TabItem {
  key: SystemTabKey
  label: string
}

const TABS: TabItem[] = [
  { key: 'rental', label: 'Tham số thuê, trả & khung phạt' },
  { key: 'tiers', label: 'Hạng thành viên & chiết khấu' },
  { key: 'rbac', label: 'Ma trận phân quyền' },
  { key: 'integrations', label: 'Tích hợp' },
]

const ADMIN_ONLY_TABS = new Set<SystemTabKey>(['rbac', 'integrations'])

export const SettingsTabBar: React.FC<SettingsTabBarProps> = ({ activeTab, onSelectTab, isAdmin }) => {
  return (
    <nav aria-label="Các mục cấu hình hệ thống" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-5">
        {TABS.filter((tab) => isAdmin || !ADMIN_ONLY_TABS.has(tab.key)).map((tab) => {
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
