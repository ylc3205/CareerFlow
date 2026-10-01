const scoreColorClass = (score) => {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-destructive'
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
      className="relative inline-flex shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`transition-all duration-300 ${scoreColorClass(clamped)}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold tabular-nums leading-none text-foreground">{clamped}</span>
        {caption && <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{caption}</span>}
      </div>
    </div>
  )
}