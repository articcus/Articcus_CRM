export default function DonutChart({ segments, size = 180 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = size / 2
  const innerRadius = radius * 0.55

  if (total === 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px] mx-auto h-auto">
        <circle cx={radius} cy={radius} r={radius - 2} fill="none" stroke="#f1f5f9" strokeWidth="2" />
        <circle cx={radius} cy={radius} r={innerRadius} fill="#fff" />
      </svg>
    )
  }

  let cumulative = 0
  const paths = segments.map((seg) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += seg.value
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2

    const x1 = radius + radius * Math.cos(startAngle)
    const y1 = radius + radius * Math.sin(startAngle)
    const x2 = radius + radius * Math.cos(endAngle)
    const y2 = radius + radius * Math.sin(endAngle)
    const ix1 = radius + innerRadius * Math.cos(endAngle)
    const iy1 = radius + innerRadius * Math.sin(endAngle)
    const ix2 = radius + innerRadius * Math.cos(startAngle)
    const iy2 = radius + innerRadius * Math.sin(startAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

    const d =
      seg.value === total
        ? `M ${radius} ${radius - radius} A ${radius} ${radius} 0 1 1 ${radius - 0.01} ${radius - radius} L ${radius - 0.01} ${radius - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${radius} ${radius - innerRadius} Z`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`

    return <path key={seg.label} d={d} fill={seg.color}>
      <title>{seg.label}: {seg.value}</title>
    </path>
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px] mx-auto h-auto">
      {paths}
    </svg>
  )
}
