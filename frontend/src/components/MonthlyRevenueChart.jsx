import { formatCurrencyCompact } from '../lib/format'

const WIDTH = 340
const HEIGHT = 200
const PAD_BOTTOM = 24
const PAD_TOP = 12
const BAR_MAX_WIDTH = 22

export default function MonthlyRevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = WIDTH / data.length
  const barWidth = Math.min(BAR_MAX_WIDTH, slot * 0.5)

  return (
    <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
      <h3 className="font-display font-bold text-sm tracking-tight mb-2">
        Won revenue, last 6 months
      </h3>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Bar chart of won revenue by month"
      >
        <line
          x1="0"
          y1={PAD_TOP + plotHeight}
          x2={WIDTH}
          y2={PAD_TOP + plotHeight}
          stroke="#e1e0d9"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const barHeight = Math.max((d.value / max) * plotHeight, d.value > 0 ? 6 : 0)
          const x = slot * i + (slot - barWidth) / 2
          const y = PAD_TOP + plotHeight - barHeight
          const isLast = i === data.length - 1

          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isLast ? '#4F46E5' : '#c7d2fe'}
              >
                <title>
                  {d.label}: {formatCurrencyCompact(d.value)}
                </title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize="10"
                className="fill-slate-400 font-mono"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
