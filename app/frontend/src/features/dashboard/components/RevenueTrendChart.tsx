import React, { useState } from 'react'
import { Card } from '@/components/common'
import { formatMillions, formatVnd, formatVnDateShort, toNumber } from '../dashboard.presentation'
import type { DashboardTrendRange, OverviewTrendPoint } from '../dashboard.type'

export interface RevenueTrendChartProps {
  points: OverviewTrendPoint[]
  totalAmount: number | string
  trendRange: DashboardTrendRange
  onChangeRange: (range: DashboardTrendRange) => void
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  points,
  totalAmount,
  trendRange,
  onChangeRange,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const rangeLabel =
    points.length > 0
      ? `${formatVnDateShort(points[0].date)} – ${formatVnDateShort(points[points.length - 1].date)} · Ghi nhận tại thời điểm bán / quyết toán`
      : 'Ghi nhận tại thời điểm bán / quyết toán'

  const width = 680
  const height = 220
  const padLeft = 44
  const padRight = 18
  const padTop = 18
  const padBottom = 28
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxMillions = Math.max(
    1,
    ...points.map((p) => toNumber(p.totalAmount) / 1_000_000),
  )
  const yMax = Math.ceil(maxMillions * 1.15)
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax].map((v) => Math.round(v * 10) / 10)

  const coords = points.map((p, i) => {
    const x =
      points.length <= 1
        ? padLeft + plotW / 2
        : padLeft + (i / (points.length - 1)) * plotW
    const valM = toNumber(p.totalAmount) / 1_000_000
    const y = padTop + plotH - (yMax > 0 ? (valM / yMax) * plotH : 0)
    return { x, y, point: p }
  })

  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaPoints =
    coords.length > 0
      ? `${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} ${linePoints} ${coords[coords.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)}`
      : ''

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx]?.point ?? null : null

  return (
    <Card
      title="Doanh thu theo thời gian"
      subtitle={rangeLabel}
      className="h-full"
    >
      {/* Segmented Range Toggle */}
      <div
        role="tablist"
        aria-label="Khoảng thời gian xu hướng doanh thu"
        className="mb-4 inline-flex rounded-xl bg-indigo-50/70 p-1 text-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={trendRange === 'WEEK'}
          onClick={() => onChangeRange('WEEK')}
          className={`min-h-9 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
            trendRange === 'WEEK'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tuần này
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={trendRange === 'MONTH'}
          onClick={() => onChangeRange('MONTH')}
          className={`min-h-9 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
            trendRange === 'MONTH'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tháng này
        </button>
      </div>

      {/* Headline Amount & Legend */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {formatVnd(totalAmount)}
        </div>
        {activePoint ? (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-800">
            <span className="font-semibold">{activePoint.label}</span>: Bán{' '}
            {formatVnd(activePoint.salesAmount)} · Thuê/Phạt{' '}
            {formatVnd(activePoint.rentalAndPenaltyAmount)} · Tổng{' '}
            <span className="font-bold">{formatVnd(activePoint.totalAmount)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            Doanh thu · Đơn vị: triệu đồng
          </div>
        )}
      </div>

      {/* Pure SVG Line Chart */}
      {points.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
          Chưa có dữ liệu doanh thu trong kỳ này.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Biểu đồ đường doanh thu theo thời gian"
            className="h-52 w-full min-w-[420px]"
          >
            <defs>
              <linearGradient id="dash-rev-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
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

            {/* Shaded area & line */}
            <polygon points={areaPoints} fill="url(#dash-rev-area)" />
            <polyline
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />

            {/* Interactive Data Points + X Labels */}
            {coords.map((c, idx) => {
              const showLabel =
                points.length <= 10 ||
                idx === 0 ||
                idx === points.length - 1 ||
                idx % Math.ceil(points.length / 7) === 0
              const isHovered = hoveredIdx === idx

              return (
                <g key={c.point.date}>
                  {showLabel && (
                    <text
                      x={c.x}
                      y={height - 8}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px]"
                    >
                      {c.point.label}
                    </text>
                  )}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? 5.5 : 3.5}
                    className="fill-indigo-600 stroke-white transition-all cursor-pointer"
                    strokeWidth="2"
                    tabIndex={0}
                    aria-label={`${c.point.label}: ${formatVnd(c.point.totalAmount)}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onFocus={() => setHoveredIdx(idx)}
                    onBlur={() => setHoveredIdx(null)}
                  />
                </g>
              )
            })}
          </svg>
        </div>
      )}

      {points.length > 0 && points.length <= 10 && (
        <p className="sr-only">
          {points.map((p) => `${p.label}: ${formatMillions(p.totalAmount)}`).join(' · ')} · Tổng{' '}
          {formatMillions(totalAmount)} triệu đồng
        </p>
      )}
    </Card>
  )
}
