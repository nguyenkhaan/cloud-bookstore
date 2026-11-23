import type { PosTab } from '../pos-transaction.type'
import type { PosTabDefinition } from '../pos-transaction.fixture'

interface PosWorkspaceTabsProps {
  activeTab: PosTab
  onChange: (tab: PosTab) => void
  tabs: readonly PosTabDefinition[]
}

export function PosWorkspaceTabs({ activeTab, onChange, tabs }: PosWorkspaceTabsProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-indigo-50/60 p-1">
      <div className="flex min-w-max gap-1" role="tablist" aria-label="Nghiệp vụ quầy giao dịch">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                isActive ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
              }`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
