export default function SemiCircleGauge({ percent, centerValue, centerLabel }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8
  const innerR = outerR - 16
  const ticks = 28
  const filledCount = Math.round((percent / 100) * ticks)

  const marks = Array.from({ length: ticks }, (_, i) => {
    const angleDeg = 180 + (180 * i) / (ticks - 1)
    const angle = (angleDeg * Math.PI) / 180
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + outerR * Math.cos(angle)
    const y2 = cy + outerR * Math.sin(angle)
    const filled = i < filledCount

    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={filled ? '#4F46E5' : '#EEEDFD'}
        strokeWidth="6"
        strokeLinecap="round"
      />
    )
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size / 2 + 44}`}
      className="w-full max-w-[220px] mx-auto h-auto"
      role="img"
      aria-label={`${centerLabel}: ${percent}%`}
    >
      {marks}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="30"
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
        className="fill-slate-900"
      >
        {centerValue}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        className="fill-indigo-600"
      >
        {centerLabel}
      </text>
    </svg>
  )
}
