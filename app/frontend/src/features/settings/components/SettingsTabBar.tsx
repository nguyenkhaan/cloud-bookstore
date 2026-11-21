import React from 'react'
import type { SystemTabKey } from '../settings.type'

interface SettingsTabBarProps {
  activeTab: SystemTabKey
  onSelectTab: (tab: SystemTabKey) => void
  isAdmin: boolean
}

interface TabItem {
  key: SystemTabKey
  code: string
  label: string
}

const TABS: TabItem[] = [
  { key: 'rental', code: 'SCR-SYS-01', label: 'Tham số Thuê, Trả & Khung phạt' },
  { key: 'tiers', code: 'SCR-SYS-02', label: 'Hạng thành viên & Chiết khấu' },
  { key: 'rbac', code: 'SCR-SYS-03', label: 'Ma trận phân quyền RBAC' },
  { key: 'integrations', code: 'SCR-SYS-04', label: 'Cấu hình Tích hợp' },
]

export const SettingsTabBar: React.FC<SettingsTabBarProps> = ({ activeTab, onSelectTab, isAdmin }) => {
  return (
    <div className="flex flex-col gap-3 pb-2 border-b border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.code}
                </span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              isAdmin
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isAdmin ? 'Admin · Có quyền chỉnh sửa' : 'Quản lý / Nhân viên · Chỉ xem'}
          </span>
        </div>
      </div>
    </div>
  )
}
