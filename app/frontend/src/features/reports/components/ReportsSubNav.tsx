import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, FileSpreadsheet, Landmark } from 'lucide-react'
import { reportsPaths } from '../reports.route'

export type ReportsSubNavTab = 'revenue-expense' | 'deposit-reconciliation' | 'tax-declaration'

export interface ReportsSubNavProps {
  active: ReportsSubNavTab
}

const TABS: Array<{
  id: ReportsSubNavTab
  label: string
  code: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: 'revenue-expense',
    label: 'Doanh thu & Chi phí',
    code: 'SCR-REP-02',
    to: reportsPaths.revenueExpense,
    icon: BarChart3,
  },
  {
    id: 'deposit-reconciliation',
    label: 'Đối soát Tiền cọc',
    code: 'SCR-REP-03',
    to: reportsPaths.depositReconciliation,
    icon: Landmark,
  },
  {
    id: 'tax-declaration',
    label: 'Kê khai Thuế tự động',
    code: 'SCR-REP-04',
    to: reportsPaths.taxDeclaration,
    icon: FileSpreadsheet,
  },
]

export const ReportsSubNav: React.FC<ReportsSubNavProps> = ({ active }) => {
  return (
    <nav
      aria-label="Phân hệ Báo cáo & Thuế"
      className="print:hidden flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === active
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{tab.label}</span>
            <span
              className={`hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:inline ${
                isActive ? 'bg-indigo-500 text-indigo-50' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.code}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
