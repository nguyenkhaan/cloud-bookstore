import React, { useState } from 'react'
import { Card } from '@/components/common'
import { formatMillions, formatVnd, toNumber } from '../reports.presentation'
import type { RevenueExpenseTrendBucket } from '../reports.type'

export interface RevenueExpenseTrendChartProps {
  buckets: RevenueExpenseTrendBucket[]
  totalRevenue: number | string
  totalExpense: number | string
}

export const RevenueExpenseTrendChart: React.FC<RevenueExpenseTrendChartProps> = ({
  buckets,
  totalRevenue,
  totalExpense,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const width = 780
  const height = 220
  const padLeft = 44
  const padRight = 22
  const padTop = 18
  const padBottom = 30
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxMillions = Math.max(
    1,
    ...buckets.map((b) => Math.max(toNumber(b.revenueAmount), toNumber(b.expenseAmount)) / 1_000_000),
  )
  const yMax = Math.ceil(maxMillions * 1.15)
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax].map((v) => Math.round(v * 10) / 10)

  const coords = buckets.map((b, i) => {
    const x =
      buckets.length <= 1
        ? padLeft + plotW / 2
        : padLeft + (i / (buckets.length - 1)) * plotW
    const revY = padTop + plotH - (yMax > 0 ? ((toNumber(b.revenueAmount) / 1_000_000) / yMax) * plotH : 0)
    const expY = padTop + plotH - (yMax > 0 ? ((toNumber(b.expenseAmount) / 1_000_000) / yMax) * plotH : 0)
    return { x, revY, expY, bucket: b }
  })

  const revPoints = coords.map((c) => `${c.x.toFixed(1)},${c.revY.toFixed(1)}`).join(' ')
  const expPoints = coords.map((c) => `${c.x.toFixed(1)},${c.expY.toFixed(1)}`).join(' ')
  const activeBucket = hoveredIdx !== null ? coords[hoveredIdx]?.bucket ?? null : null

  return (
    <Card
      title="Xu hướng doanh thu / Chi phí"
      subtitle="Theo nhóm ngày trong kỳ · Đơn vị triệu đồng"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            Doanh thu
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
            Chi phí · Hổ phách
          </span>
        </div>

        {activeBucket && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
            <span className="font-semibold">{activeBucket.label}</span>: Thu{' '}
            <span className="font-semibold text-indigo-700">{formatVnd(activeBucket.revenueAmount)}</span> · Chi{' '}
            <span className="font-semibold text-amber-700">{formatVnd(activeBucket.expenseAmount)}</span>
          </div>
        )}
      </div>

      {buckets.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
          Chưa có dữ liệu xu hướng trong khoảng thời gian đã chọn.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Biểu đồ xu hướng doanh thu và chi phí"
            className="h-52 w-full min-w-[460px]"
          >
            {yTicks.map((tick, idx) => {
              const y = padTop + plotH - (yMax > 0 ? (tick / yMax) * plotH : 0)
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            <polyline
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={revPoints}
            />
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={expPoints}
            />

            {coords.map((c, idx) => (
              <g key={c.bucket.label}>
                <text
                  x={c.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {c.bucket.label}
                </text>
                <circle
                  cx={c.x}
                  cy={c.revY}
                  r={hoveredIdx === idx ? 5 : 3.5}
                  className="fill-indigo-600 stroke-white cursor-pointer"
                  strokeWidth="2"
                  tabIndex={0}
                  aria-label={`${c.bucket.label} doanh thu ${formatVnd(c.bucket.revenueAmount)}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                />
                <circle
                  cx={c.x}
                  cy={c.expY}
                  r={hoveredIdx === idx ? 5 : 3.5}
                  className="fill-amber-600 stroke-white cursor-pointer"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            ))}
          </svg>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span>
          Doanh thu: {buckets.map((b) => formatMillions(b.revenueAmount)).join(' · ')} ={' '}
          <strong className="text-slate-700">{formatMillions(totalRevenue)} triệu đồng</strong>
        </span>
        <span>·</span>
        <span>
          Chi phí: {buckets.map((b) => formatMillions(b.expenseAmount)).join(' · ')} ={' '}
          <strong className="text-slate-700">{formatMillions(totalExpense)} triệu đồng</strong>
        </span>
      </div>
    </Card>
  )
}
