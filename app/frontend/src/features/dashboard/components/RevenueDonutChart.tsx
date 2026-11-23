import React from 'react'
import { Card } from '@/components/common'
import { formatMillions, formatPercent, formatVnd, toNumber } from '../dashboard.presentation'
import type { OverviewRevenueStructure } from '../dashboard.type'

export interface RevenueDonutChartProps {
  structure: OverviewRevenueStructure
}

export const RevenueDonutChart: React.FC<RevenueDonutChartProps> = ({ structure }) => {
  const lostAmount = toNumber(structure.lostBookAmount)
  const segments = [
    {
      key: 'sales',
      label: 'Bán sách',
      amount: toNumber(structure.salesAmount),
      pct: structure.salesPct,
      color: '#4f46e5',
      dotClass: 'bg-indigo-600',
      textClass: 'text-indigo-700',
    },
    {
      key: 'rental',
      label: 'Phí thuê',
      amount: toNumber(structure.rentalFeeAmount),
      pct: structure.rentalFeePct,
      color: '#10b981',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
    },
    {
      key: 'penalty',
      label: 'Tiền phạt',
      amount: toNumber(structure.penaltyAmount),
      pct: structure.penaltyPct,
      color: '#ef4444',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600',
    },
    ...(lostAmount > 0
      ? [
          {
            key: 'lost',
            label: 'Cọc mất sách',
            amount: lostAmount,
            pct: structure.lostBookPct,
            color: '#f59e0b',
            dotClass: 'bg-amber-500',
            textClass: 'text-amber-700',
          },
        ]
      : []),
  ]

  const radius = 56
  const strokeWidth = 22
  const circumference = 2 * Math.PI * radius
  const total = toNumber(structure.totalAmount)

  let cumulativeOffset = 0
  const arcs = segments
    .filter((s) => total > 0 && s.amount > 0)
    .map((s) => {
      const fraction = s.amount / total
      const length = fraction * circumference
      const arc = {
        ...s,
        dashArray: `${length} ${Math.max(0, circumference - length)}`,
        dashOffset: -cumulativeOffset,
      }
      cumulativeOffset += length
      return arc
    })

  const centerText =
    total >= 1_000_000
      ? `${formatMillions(total)} triệu`
      : formatVnd(total)

  return (
    <Card
      title="Cơ cấu doanh thu"
      subtitle="Hôm nay · Bao gồm tiền phạt"
      className="h-full"
    >
      <div className="flex flex-col items-center py-2">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label="Biểu đồ tròn cơ cấu doanh thu"
            className="h-44 w-44 -rotate-90"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-base font-bold text-slate-900">{centerText}</span>
            <span className="text-[10px] text-slate-500">Tổng đã quyết toán</span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${seg.dotClass}`} />
              <span className={`font-medium ${seg.textClass}`}>{seg.label}</span>
            </div>
            <div className={`font-semibold ${seg.textClass}`}>
              {formatVnd(seg.amount)} · {formatPercent(seg.pct)}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        Cọc nhận / Hoàn cọc không thuộc cơ cấu doanh thu.
      </p>
    </Card>
  )
}
