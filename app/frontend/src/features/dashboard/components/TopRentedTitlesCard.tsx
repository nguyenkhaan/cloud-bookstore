import React from 'react'
import { Card } from '@/components/common'
import { toNumber } from '../dashboard.presentation'
import type { TopRentedTitle } from '../dashboard.type'

export interface TopRentedTitlesCardProps {
  titles: TopRentedTitle[]
  monthLabel: string
}

export const TopRentedTitlesCard: React.FC<TopRentedTitlesCardProps> = ({
  titles,
  monthLabel,
}) => {
  const maxCount = Math.max(1, ...titles.map((t) => toNumber(t.rentalCount)))

  return (
    <Card
      title="Top 10 đầu sách được thuê nhiều nhất"
      subtitle={`${monthLabel} · Đơn vị: lượt thuê`}
    >
      {titles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
          Chưa phát sinh lượt thuê nào trong tháng này.
        </div>
      ) : (
        <div className="space-y-2.5">
          {titles.map((item, idx) => {
            const pct = Math.max(4, Math.round((toNumber(item.rentalCount) / maxCount) * 100))
            const barOpacity = idx === 0 ? 'bg-indigo-600' : idx <= 2 ? 'bg-indigo-500' : 'bg-indigo-400/80'

            return (
              <div
                key={item.titleId}
                className="grid grid-cols-12 items-center gap-3 text-xs"
              >
                <div
                  className="col-span-5 truncate font-medium text-slate-700 sm:col-span-4"
                  title={item.displayName}
                >
                  {item.displayName}
                </div>
                <div className="col-span-6 sm:col-span-7">
                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-indigo-50">
                    <div
                      className={`h-full rounded-full transition-all ${barOpacity}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-1 text-right font-bold text-slate-900">
                  {item.rentalCount}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
