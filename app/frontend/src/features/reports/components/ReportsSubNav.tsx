import React from 'react'
import { Link } from 'react-router-dom'
import { reportsPaths } from '../reports.route'

export type ReportsSubNavTab = 'revenue-expense' | 'deposit-reconciliation' | 'tax-declaration'

export interface ReportsSubNavProps {
  active: ReportsSubNavTab
}

const TABS: Array<{
  id: ReportsSubNavTab
  label: string
  to: string
}> = [
  {
    id: 'revenue-expense',
    label: 'Doanh thu & Chi phí',
    to: reportsPaths.revenueExpense,
  },
  {
    id: 'deposit-reconciliation',
    label: 'Đối soát Tiền cọc',
    to: reportsPaths.depositReconciliation,
  },
  {
    id: 'tax-declaration',
    label: 'Kê khai Thuế tự động',
    to: reportsPaths.taxDeclaration,
  },
]

export const ReportsSubNav: React.FC<ReportsSubNavProps> = ({ active }) => {
  return (
    <nav aria-label="Các báo cáo" className="print:hidden overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-5">
        {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
              isActive
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
      </div>
    </nav>
  )
}
