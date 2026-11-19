import { Link, useLocation } from 'react-router-dom'
import { adminHrPaths } from '../admin-hr.route'

type AdminHrTabsProps = {
  activeTab: 'attendance' | 'shifts'
}

const tabs = [
  { id: 'attendance' as const, label: 'Chấm công & lương ca', to: adminHrPaths.attendance },
  { id: 'shifts' as const, label: 'Phân công ca', to: adminHrPaths.shifts },
]

export function AdminHrTabs({ activeTab }: AdminHrTabsProps) {
  const location = useLocation()

  return (
    <nav aria-label="Các màn hình nhân sự Admin" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id || location.pathname === tab.to
        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 ${isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
            key={tab.id}
            to={tab.to}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
