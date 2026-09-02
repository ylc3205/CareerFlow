const scoreColor = (score) => {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

export default function ScoreGauge({ score, size = 120, caption }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${clamped} out of 100`}
      className="relative inline-flex items-center justify-center"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={scoreColor(clamped)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{clamped}</span>
        {caption && <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{caption}</span>}
      </div>
    </div>
  )
}