import type { ApprovalTabKey } from '../approvals.type'

interface ApprovalTabBarProps {
  activeTab: ApprovalTabKey
  counts: Record<ApprovalTabKey, number>
  onSelectTab: (tab: ApprovalTabKey) => void
}

const TABS: Array<{ key: ApprovalTabKey; label: string }> = [
  { key: 'old-book-price', label: 'Thu mua vượt hạn mức' },
  { key: 'damage-penalty', label: 'Phạt hư hỏng' },
  { key: 'inventory-adjustment', label: 'Điều chỉnh kho' },
  { key: 'disposal-reversal', label: 'Xuất hủy / Đảo hóa đơn' },
]

export function ApprovalTabBar({ activeTab, counts, onSelectTab }: ApprovalTabBarProps) {
  return (
    <nav aria-label="Các nhóm yêu cầu phê duyệt" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-5">
        {TABS.map((tab) => {
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
