export function MiniBars({ values, height = 36, highlightLast = 3 }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {values.map((v, i) => {
        const isHighlighted = i >= values.length - highlightLast
        return (
          <div
            key={i}
            className="w-1.5 rounded-full"
            style={{
              height: `${Math.max((v / max) * 100, 10)}%`,
              backgroundColor: isHighlighted ? '#10b981' : '#d1fae5',
            }}
          />
        )
      })}
    </div>
  )
}

export function MiniSparkline({ values, width = 96, height = 36 }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = width / (values.length - 1 || 1)
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 6) - 3}`)
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
