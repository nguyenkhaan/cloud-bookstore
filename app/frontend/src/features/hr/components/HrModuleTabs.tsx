import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { hrPaths } from '../hr.route'

interface HrTabItem {
  id: string
  label: string
  to: string
  matchPrefix: string
}

const HR_TABS: HrTabItem[] = [
  {
    id: 'employees',
    label: 'Danh sách nhân viên',
    to: hrPaths.employees,
    matchPrefix: hrPaths.employees,
  },
  {
    id: 'shifts',
    label: 'Phân công ca',
    to: hrPaths.shifts,
    matchPrefix: hrPaths.shifts,
  },
  {
    id: 'attendance',
    label: 'Chấm công',
    to: hrPaths.attendance,
    matchPrefix: hrPaths.attendance,
  },
  {
    id: 'requests',
    label: 'Đơn xét duyệt',
    to: hrPaths.requests,
    matchPrefix: hrPaths.requests,
  },
  {
    id: 'payroll',
    label: 'Bảng lương',
    to: hrPaths.payroll,
    matchPrefix: hrPaths.payroll,
  },
  {
    id: 'payslip',
    label: 'Phiếu lương',
    to: hrPaths.payslip,
    matchPrefix: hrPaths.payslip,
  },
]

export interface HrModuleTabsProps {
  activePath?: string
  className?: string
}

export function HrModuleTabs({ activePath, className }: HrModuleTabsProps) {
  const location = useLocation()
  const currentPathname = activePath ?? location.pathname

  return (
    <nav
      aria-label="Phân hệ Nhân sự & tiền lương"
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs',
        className,
      )}
      data-testid="hr-module-tabs"
    >
      {HR_TABS.map((tab) => {
        const isActive =
          currentPathname === tab.matchPrefix ||
          currentPathname.startsWith(`${tab.matchPrefix}/`)

        return (
          <Link
            key={tab.id}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-[44px] items-center rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1',
              isActive
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
            )}
            to={tab.to}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
